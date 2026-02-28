<br/>

<p align="center">
  <img src="images/vinted_downloader_icon.png" alt="Vinted Image Downloader Icon" width="130"/>
</p>

<h1 align="center">Vinted Downloader</h1>

A Tampermonkey userscript for Vinted that enables you to download all high-resolution images from any item listing with a single click. The script automatically converts Vinted's default `.webp` images into widely-compatible `.jpg` format, saving you time and effort.

## Features

-   **Download All as ZIP**: Easily download every photo on an item listing bundled into a single `.zip` file
-   **Single Image Download**: Each photo has a "Save JPG" button after clicking on it, directly overlaying the top-left of the fullscreen image
-   **Automatic Conversion**: All images are automatically converted from `.webp` to `.jpg` instantly in your browser before saving
-   **Smart Naming**: Your files are intelligently named using the clean format: `{Brand_Name} - {Item_Name} {Image_Index}.jpg` with safe spacing and invalid characters stripped away
-   **Robust Error Handling**: If Vinted alters their DOM or image CDNs, the script will alert you with explicit error messages
-   **High Resolution**: Automatically extracts the highest standard quality images available

## Supported Websites

Works on all regional Vinted domains, including but not limited to:
-   **Vinted.sk** (Slovakia)
-   **Vinted.cz** (Czech Republic)
-   **Vinted.pl** (Poland)
-   **Vinted.at** (Austria)
-   **Vinted.de** (Germany)
-   **Vinted.com** (Global)
-   **Vinted.co.uk** (UK)
-   **Vinted.fr** (France)
-   **Vinted.nl** (Netherlands)

## Installation

1.  Make sure you have a Userscript manager installed in your browser:
    -   [Tampermonkey](https://www.tampermonkey.net/) (Recommended)
    -   [Violentmonkey](https://violentmonkey.github.io/)
    -   [Greasemonkey](https://www.greasespot.net/)

2.  Click **[Install here](https://raw.githubusercontent.com/NightMean/Vinted_Downloader/main/vinted_downloader.user.js)** 
3.  Confirm the installation in your Userscript manager.
4.  Open any Vinted item listing and enjoy!

## How it Works

The script leverages the `application/ld+json` structured data provided securely by Vinted to ensure accurate naming of your downloads based on the item's brand and title.

For downloads, it intercepts image URLs directly from the DOM, upgrades them to full resolution (`/f800/`), and pipes the data into an invisible HTML5 `<canvas>`. The `<canvas>` is then used to convert the raw pixel data into a highly compatible `image/jpeg` Blob using the browser's native capabilities, entirely bypassing Vinted's CDN limitations.

## Todo
- [x] Basic support of downloading single image listings
- [ ] Convert the userscript into a standalone Chrome Extension
- [ ] Support downloading product information details
- [ ] Support downloading a summary of the listings
- [ ] Download all listings (with summary and images) of a specific seller
- [ ] Support different formats for downloading images
- [ ] Support downloading images in lower resolutions
- [ ] Batch downloading of selected product listings using checkboxes

## Donations
To support me you can use link below:

<a href="https://www.buymeacoffee.com/nightmean" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="width: 200px !important;" ></a>

## Dependencies

-   [fflate](https://github.com/101arrowz/fflate): For seamlessly generating ZIP files rapidly in the main thread to bypass restrictive CSP protocols.
-   [FileSaver.js](https://github.com/eligrey/FileSaver.js/): For triggering clean file downloads.

## License

This project is licensed under the **MIT** License.