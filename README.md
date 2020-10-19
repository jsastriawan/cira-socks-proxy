# cira-socks-proxy

Tunneling WSMAN and REDIR over Meshcentral webrelay via local socks proxy

Note: This is assuming IP address are unique. To ensure each machine is unique, hostname should be the nodeid or UUID. 


# Setup


## Requirements

* Node 12.19.0 (LTS) : https://nodejs.org/en/download/

* Git : https://git-scm.com/downloads


## Installation
```
$ npm i
```


# Usage
1. Create config.json file in private folder (within root folder) and follow the format of private/meshcentral_config.json.

```
$ node main.js
```

Enjoy!!!
