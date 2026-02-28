// ==UserScript==
// @name         Vinted - Image Downloader
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Downloads item images from Vinted listings as JPG. Includes a "Download All" ZIP button and individual save buttons.
// @author       NightMean
// @match        *://*.vinted.sk/items/*
// @match        *://*.vinted.cz/items/*
// @match        *://*.vinted.pl/items/*
// @match        *://*.vinted.at/items/*
// @match        *://*.vinted.de/items/*
// @match        *://*.vinted.com/items/*
// @match        *://*.vinted.co.uk/items/*
// @match        *://*.vinted.fr/items/*
// @match        *://*.vinted.nl/items/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=vinted.com
// @require      https://cdn.jsdelivr.net/npm/fflate@0.8.2/umd/index.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// ==/UserScript==

(function () {
    'use strict';

    // Basic styling for the buttons
    GM_addStyle(`
        .vinted-dl-all-btn {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background-color: #007782; /* Vinted signature teal */
            color: white;
            border: none;
            border-radius: 8px;
            padding: 12px 20px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            z-index: 9999;
            transition: background-color 0.2s, transform 0.1s;
        }
        .vinted-dl-all-btn:hover {
            background-color: #005f68;
        }
        .vinted-dl-all-btn:active {
            transform: scale(0.95);
        }
        .vinted-dl-all-btn:disabled {
            background-color: #7abcc2;
            cursor: not-allowed;
            transform: none;
        }
        
        .vinted-save-single-btn {
            position: absolute;
            top: 10px;
            left: 10px;
            background-color: rgba(255, 255, 255, 0.9);
            color: #007782;
            border: 1px solid #007782;
            border-radius: 4px;
            padding: 6px 10px;
            font-size: 12px;
            font-weight: bold;
            cursor: pointer;
            z-index: 100;
            transition: background-color 0.2s;
        }
        .vinted-save-single-btn:hover {
            background-color: #007782;
            color: white;
        }
    `);

    // Helper: Safely generate valid filename stripping diacritics
    function sanitizeFilename(name) {
        // Strip diacritics/accents (e.g. š -> s, á -> a)
        let clean = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        // Replace invalid Windows/Mac filename characters and spaces with underscores
        clean = clean.replace(/[<>:"/\\|?*\s]/g, '_');
        // Replace multiple consecutive underscores with a single one
        clean = clean.replace(/_+/g, '_').trim();
        return clean;
    }

    // Helper: Extract metadata (Brand and Item Name) from JSON-LD
    function getItemMetadata() {
        let meta = { brand: 'Vinted', name: 'Item' };
        try {
            const scripts = document.querySelectorAll('script[type="application/ld+json"]');
            for (let script of scripts) {
                const data = JSON.parse(script.textContent);
                // Look for the Product schema
                if (data['@type'] === 'Product' || (Array.isArray(data['@type']) && data['@type'].includes('Product'))) {
                    const brand = data.brand?.name || 'Vinted';
                    const name = data.name || 'Item';
                    meta = {
                        brand: sanitizeFilename(brand),
                        name: sanitizeFilename(name)
                    };
                    return meta;
                }
            }
        } catch (e) {
            console.error('Vinted Downloader: Error parsing JSON-LD', e);
        }

        // Fallback
        const h1 = document.querySelector('h1');
        if (h1) meta.name = sanitizeFilename(h1.innerText);
        return meta;
    }

    // Helper: Get all image URLs and upscale them
    function getImageUrls() {
        const images = Array.from(document.querySelectorAll('.item-thumbnail img, .item-main-image img'));
        const urls = new Set();

        images.forEach(img => {
            const src = img.src || img.getAttribute('data-src');
            if (src) {
                // Upscale to high resolution (f800 is the standard max full size on Vinted)
                const fullResUrl = src.replace(/\/f[0-9]+\//, '/f800/');
                urls.add(fullResUrl);
            }
        });

        return Array.from(urls);
    }

    // Helper: Convert Image URL to JPG Data Blob
    function fetchAndConvertImage(url) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: url,
                responseType: 'blob',
                onload: function (response) {
                    if (response.status !== 200) {
                        return reject(new Error('Failed to download image'));
                    }

                    const blob = response.response;
                    const img = new Image();
                    img.crossOrigin = "Anonymous"; // Crucial for drawing remote images to canvas
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        canvas.width = img.width;
                        canvas.height = img.height;
                        const ctx = canvas.getContext('2d');

                        // Fill white background in case of transparency
                        ctx.fillStyle = '#FFFFFF';
                        ctx.fillRect(0, 0, canvas.width, canvas.height);

                        ctx.drawImage(img, 0, 0);

                        canvas.toBlob((jpgBlob) => {
                            resolve(jpgBlob);
                        }, 'image/jpeg', 0.95);
                    };
                    img.onerror = reject;

                    const urlCreator = window.URL || window.webkitURL;
                    const imageUrl = urlCreator.createObjectURL(blob);
                    img.src = imageUrl;
                },
                onerror: reject
            });
        });
    }

    // Download Single Image
    async function downloadSingleImage(url, index) {
        try {
            const meta = getItemMetadata();
            const fileName = `${meta.brand} - ${meta.name} ${index}.jpg`;

            const jpgBlob = await fetchAndConvertImage(url);
            saveAs(jpgBlob, fileName);
        } catch (e) {
            console.error('Vinted Downloader: Failed to save the image.', e);
            alert(`Vinted Downloader: Failed to save the image. Error: ${e.message}`);
        }
    }

    // Download All Images as ZIP (Synchronous via fflate to bypass CSP)
    async function downloadAllAsZip() {
        const btn = document.querySelector('.vinted-dl-all-btn');
        if (btn) {
            btn.disabled = true;
            btn.innerText = 'Preparing...';

            try {
                const urls = getImageUrls();
                if (urls.length === 0) {
                    alert('Vinted Downloader: No images found on this page. Vinted might have changed their page structure or image URLs.');
                    return;
                }

                const meta = getItemMetadata();
                const folderName = `${meta.brand} - ${meta.name}`;

                // We use fflate to build the ZIP safely on identical thread.
                const zipData = {};

                for (let i = 0; i < urls.length; i++) {
                    btn.innerText = `Downloading ${i + 1} / ${urls.length}...`;
                    const jpgBlob = await fetchAndConvertImage(urls[i]);
                    const data = new Uint8Array(await jpgBlob.arrayBuffer());

                    const fileName = `${folderName}/${meta.brand} - ${meta.name} ${i + 1}.jpg`;
                    zipData[fileName] = data;
                }

                btn.innerText = 'Creating ZIP...';

                // level 0 = STORE (no compression needed for JPGs, and it's lightning fast)
                const zipped = fflate.zipSync(zipData, { level: 0 });
                const zipBlob = new Blob([zipped], { type: 'application/zip' });
                saveAs(zipBlob, `${folderName}.zip`);

            } catch (e) {
                console.error('Vinted Downloader: Error downloading all images.', e);
                alert(`Vinted Downloader: An error occurred while downloading the images. Error: ${e.message}`);
            } finally {
                btn.innerText = 'Download All Images';
                btn.disabled = false;
            }
        }
    }

    // Inject "Save" buttons onto individual images
    function injectSingleSaveButtons() {
        // Find all Vinted item images that haven't been processed yet
        const allImages = document.querySelectorAll('img[src*="vinted"]:not(.vinted-dl-processed)');

        allImages.forEach((img, index) => {
            // Check if this image is inside a fullscreen modal/lightbox
            // Vinted creates portals at the bottom of the body, often giving them immense z-indexes or fixed positioning
            let isModal = false;
            // Fast native check for known overlay classes (eliminates 99% of images instantly)
            const modalWrapper = img.closest('.image-carousel, [data-testid="image-carousel"], [role="dialog"], .modal, .lightbox, .overlay');

            if (modalWrapper) {
                isModal = true;
            } else {
                // Fallback check: Only check immediate parents for fixed overlay if classes missed
                let current = img.parentElement;
                let depth = 0;
                while (current && current !== document.body && depth < 4) {
                    const style = window.getComputedStyle(current);
                    const zIndex = parseInt(style.zIndex, 10);
                    if ((style.position === 'fixed' || style.position === 'absolute') && zIndex > 50) {
                        isModal = true;
                        break;
                    }
                    current = current.parentElement;
                    depth++;
                }
            }

            // Only add individual save buttons if we're in the zoomed-in view
            if (!isModal) return;

            // Mark image to avoid processing it repeatedly across iterations
            img.classList.add('vinted-dl-processed');

            const container = img.closest('figure') || img.parentElement;
            if (!container) return;

            // Avoid duplicate buttons in this container
            if (container.querySelector('.vinted-save-single-btn')) return;

            const btn = document.createElement('button');
            btn.className = 'vinted-save-single-btn';
            btn.innerText = 'Save JPG';

            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                const src = img.src || img.getAttribute('data-src');
                if (src) {
                    // Always try to fetch f800 size
                    const fullResUrl = src.replace(/\/f[0-9]+\//, '/f800/');
                    downloadSingleImage(fullResUrl, Math.floor(Math.random() * 1000));
                }
            });

            if (window.getComputedStyle(container).position === 'static') {
                container.style.position = 'relative';
            }
            container.appendChild(btn);
        });
    }

    // Main UI Injection
    function injectUI() {
        // Prevent double injection
        if (document.querySelector('.vinted-dl-all-btn')) return;

        // "Download All" button
        const dlAllBtn = document.createElement('button');
        dlAllBtn.className = 'vinted-dl-all-btn';
        dlAllBtn.innerText = 'Download All Images';
        dlAllBtn.addEventListener('click', downloadAllAsZip);
        document.body.appendChild(dlAllBtn);

        // Inject individual buttons
        injectSingleSaveButtons();
    }

    // Since Vinted uses React/SPA, we observe DOM mutations to inject buttons when new images load
    const observer = new MutationObserver(() => {
        // Throttle slightly to avoid processing too often
        requestAnimationFrame(() => {
            injectUI();
            injectSingleSaveButtons();
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Initial injection attempt
    window.addEventListener('load', injectUI);
    // Also try immediately in case the page is already loaded
    setTimeout(injectUI, 1000);

})();
