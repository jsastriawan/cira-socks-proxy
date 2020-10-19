# cira-socks-proxy

Tunneling WSMAN and REDIR over Meshcentral webrelay via local socks proxy

Note: This is assuming IP address are unique. To ensure each machine is unique, hostname should be the nodeid or UUID. 


## Setup

### Requirements

* Node 12.19.0 (LTS) : https://nodejs.org/en/download/

* Git : https://git-scm.com/downloads


### Installation

```
$ npm i
```

### Prerequisites

Create config.json file in private folder (within root folder). Follow the format of private/meshcentral_sample_config.json.

#### Sample config.json for MeshCentral

```json
{
    "type": "meshcentral",
    "url": "https://meshcentral.com",
    "user": "my@username!23",
    "pass": "my@Password$053"
}

```

#### Sample config.json for ActivEdge MPS

```json
{
    "type": "activedge",
    "url": "https://activedgempsserver.com:3000",
    "mpsapikey": "APIKEYFORMPS123!"
}

```

## Usage

Start the server. By default, server listens on port 1080 !!!

```
$ node main.js
```

Enjoy!!!
