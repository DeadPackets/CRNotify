# CRNotify
This is a system that crawls AUS' Banner website to check for updates about certain CRNs that students can "Subscribe" to their status. It uses Google's `puppeteer` library to run a headless Chrome browser and scrape the Banner website.

### Mobile App
There used to be a mobile app for CRNotify, however it needs to be updated. It can be found at [CRNotify-App](https://github.com/DeadPackets/CRNotify-App). There is an API that the mobile app uses to interact with the webserver, I might write documentation for it later if I ever feel like giving myself nightmares.

### Statistics Page
You can find some simple statistics at `/stats` but it sucks and I need to update it. Will I update it? Who knows. Time will only tell.

## TODO:

- [x] Fix the random errors that Banner makes all of a sudden. (Or build a workaround)
- [x] A e s t h e t i c s
- [ ] Support more notifictation methods, maybe integrate IFTTT directly
- [x] Optimize SQL queries
- [x] Stats and FAQ
- [x] Use bootstrap to fix resposive layout issues
- [ ] Settings page
- [ ] 
