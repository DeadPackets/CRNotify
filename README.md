<p align="center">
  <img src="https://github.com/DeadPackets/CRNotify/raw/master/logo.jpg">
</p>

![GitHub last commit](https://img.shields.io/github/last-commit/DeadPackets/CRNotify)
![GitHub package.json version](https://img.shields.io/github/package-json/v/DeadPackets/CRNotify)
![GitHub](https://img.shields.io/github/license/DeadPackets/CRNotify)
![GitHub issues](https://img.shields.io/github/issues/DeadPackets/CRNotify)
![GitHub pull requests](https://img.shields.io/github/issues-pr/DeadPackets/CRNotify)
![GitHub code size in bytes](https://img.shields.io/github/languages/code-size/DeadPackets/CRNotify)
![Snyk Vulnerabilities for GitHub Repo](https://img.shields.io/snyk/vulnerabilities/github/DeadPackets/CRNotify)
![Open Source Love](https://badges.frapsoft.com/os/v1/open-source.svg?v=103)
![ForTheBadge uses-js](http://ForTheBadge.com/images/badges/uses-js.svg)
![Dependencies](https://david-dm.org/DeadPackets/CRNotify.svg)

This is a system that crawls AUS' Banner website to check for updates about certain CRNs that students can "Subscribe" to their status. It uses Google's `puppeteer` library to run a headless Chrome browser and scrape the Banner website.

### Mobile App
There used to be a mobile app for CRNotify, however it needs to be updated. It can be found at [CRNotify-App](https://github.com/DeadPackets/CRNotify-App). There is an API that the mobile app uses to interact with the webserver, I might write documentation for it later if I ever feel like giving myself nightmares.

### Statistics Page
You can find some simple statistics at `/stats` but it sucks and I need to update it. Will I update it? Who knows. Time will only tell.

### Things To Do:
- [x] Fix the random errors that Banner makes all of a sudden. (Or build a workaround)
- [x] A e s t h e t i c s
- [x] Optimize SQL queries
- [x] Use bootstrap to fix resposive layout issues
- [ ] Integrate IFTTT Notifications (if needed, might not consider tbh)
- [ ] Pre-crawl Banner before the system launches to remove a BUNCH of load
- [ ] Improve the HTML to avoid grid errors when displaying subscribed CRNs
