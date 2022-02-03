const port = 3005; // 포트 설정
const mytoken = 'homeassistant' // 토큰 설정
const http = require('http');
const url = require("url");
const child_process = require("child_process");
const fs = require('fs');
const axios = require('axios');
const data = JSON.parse(fs.readFileSync('/app/radio-list.json', 'utf8')); // 라디오 주소 저장 파일 열기

const instance = axios.create({
    timeout: 3000,
});

function return_pipe(urls, resp, req) {
    var xffmpeg = child_process.spawn("ffmpeg", [
         "-loglevel", "error", "-i", urls, "-acodec", "libmp3lame", "-ar", "44100", "-f", "mp3", "pipe:1" // output to stdout
    ], {
        detached: false
    });

    xffmpeg.stdout.pipe(resp);
    console.log("new input " + xffmpeg.pid);

    xffmpeg.on("exit", function(code) {});

    xffmpeg.on("error", function(e) {
        console.log("Xsystem error: " + e);
    });
xffmpeg.stdout.on("data",function(data) {
});

    req.on("close", function() {
        if (xffmpeg) {
            console.log("close " + xffmpeg.pid);
            xffmpeg.kill();
        }
    });

    req.on("end", function() {
        if (xffmpeg) {
            console.log("end " + xffmpeg.pid);
            xffmpeg.kill();
        }
    });
}
var liveServer = http.createServer((req, resp) => {
    const urlParts = url.parse(req.url, true);
    const urlParams = urlParts.query;
	console.log(urlParams);
	const urlPath = urlParts.pathname;
	
	if(urlPath == "/radio"){
		
	const token_key = urlParams['token'];
	if(token_key == mytoken){
		const key = urlParams['keys'];
		console.log("your input : " + key);

		if (key) {
			const myData = data[key];
			if (Object.hasOwnProperty.call(data, key)) { // 라디오 리스트에 key가 존재한다면?
				if (!myData.includes('http')) {

					if (myData == "kbs_lib") {
						getkbs(key).then(function(data1) {


							var urls = data1;
							if (urls != 'invaild' && urls.includes('m3u8')) {

								return_pipe(urls, resp, req);
							} else {
								resp.statusCode = 403;
								resp.setHeader('Content-Type', 'text/plain; charset=utf-8');
								resp.end('호출 실패');
							}
						});
					}
					if (myData == "sbs_lib") {
						getsbs(key).then(function(data1) {

							var urls = data1;
							if (urls != 'invaild' && urls.includes('m3u8')) {

								return_pipe(urls, resp, req);
							} else {
								resp.statusCode = 403;
								resp.setHeader('Content-Type', 'text/plain; charset=utf-8');
								resp.end('호출 실패');
							}
						});
					}
					if (myData == "mbc_lib") {
						getmbc(key).then(function(data1) {

							var urls = data1;
							if (urls != 'invaild' && urls.includes('m3u8')) {
								return_pipe(urls, resp, req);
							} else {
								resp.statusCode = 403;
								resp.setHeader('Content-Type', 'text/plain; charset=utf-8');
								resp.end('호출 실패');
							}
						});
					}
				} else {
					var beforeEn = true;
					var urls = myData
					return_pipe(urls, resp, req);
				}
			} else {

				resp.statusCode = 403;
				resp.setHeader('Content-Type', 'text/plain; charset=utf-8');
				resp.end('올바르지 않은 코드');
			}
		} else {

			resp.statusCode = 403;
			resp.setHeader('Content-Type', 'text/plain; charset=utf-8');
			resp.end('올바르지 않은 접근');
		}
		}else {

			resp.statusCode = 403;
			resp.setHeader('Content-Type', 'text/plain; charset=utf-8');
			resp.end('올바르지 않은 접근');
		}
	}else{
        resp.statusCode = 403;
        resp.setHeader('Content-Type', 'text/plain; charset=utf-8');
        resp.end('올바르지 않은 접근');
	}
});

function getkbs(param) {
    return new Promise(function(resolve, reject) {

        let kbs_ch = {
            'kbs_1radio': '21',
            'kbs_3radio': '23',
            'kbs_classic': '24',
            'kbs_cool': '25',
            'kbs_happy': '22'
        };
        try {
            instance({
                    method: 'get', //you can set what request you want to be
                    url: 'https://onair.kbs.co.kr/index.html?sname=onair&stype=live&ch_code=' + kbs_ch[param],
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.71 Safari/537.36'
                    }
                })

                .then(response => {

                    var lines = response.data.split('\n');
                    var x = 0;
                    for (let i = 0; i < lines.length; i++) {
                        if (lines[i].includes("Key-Pair-Id")) {
                            var mLine = lines[i];

                            break;
                        } else {
                            x += 1;
                        }
                    }

                    if (mLine) {
                        mLine = mLine.replace(/\\"/g, '"');

                        var mStream = mLine.split('"service_url":"')[1].split('"')[0];
                        resolve(mStream);
                    }


                }).catch(e => {
                    console.log(e)
                    resolve("invaild");
                })
        } catch {
            resolve("invaild");
        }

    })
}

function getmbc(ch) {
    return new Promise(function(resolve, reject) {
        try {
            let mbc_ch = {
                'mbc_fm4u': 'mfm',
                'mbc_fm': 'sfm',
                'allthat': 'chm'
            };

            instance({
                    method: 'get',
                    url: 'http://miniplay.imbc.com/WebHLS.ashx?channel=' + mbc_ch[ch] + '&protocol=M3U8&agent=ios&nocash=0.3996827673840577&callback=jarvis.miniInfo.loadOnAirComplete',
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.71 Safari/537.36',
                        'Referer': 'http://mini.imbc.com/',
                        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
                        'Accept-Encoding': 'gzip, deflate'
                    }
                })

                .then(response => {
                    var text = 'http://' + response.data.split('"http://')[1].split('"')[0];

                    instance({
                            method: 'get',
                            url: text,
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.71 Safari/537.36',
                                'Referer': 'http://mini.imbc.com/',
                                'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
                                'Accept-Encoding': 'gzip, deflate'
                            }
                        })

                        .then(response2 => {

                            var text2 = response2.data.split('m3u8?')[1].trim();
                            resolve('http://175.158.10.83/s' + mbc_ch[ch] + '/_definst_/' + mbc_ch[ch] + '.stream/playlist.m3u8?' + text2);


                        }).catch(e => {
                            console.log(e)
                            resolve("invaild");
                        })
                }).catch(e => {
                    console.log(e)
                    resolve("invaild");
                })
        } catch {
            resolve("invaild");
        }
    })
}

function getsbs(ch) {
    return new Promise(function(resolve, reject) {

        let sbs_ch = {
            'sbs_power': ['powerfm', 'powerpc'],
            'sbs_love': ['lovefm', 'lovepc']
        }
        try {
            instance({
                    method: 'get',
                    url: 'https://apis.sbs.co.kr/play-api/1.0/livestream/' + sbs_ch[ch][1] + '/' + sbs_ch[ch][0] + '?protocol=hls&ssl=Y',
                    headers: {
                        'Host': 'apis.sbs.co.kr',
                        'Connection': 'keep-alive',
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_16_0) AppleWebKit/537.36 (KHTML, like Gecko) GOREALRA/1.2.1 Chrome/85.0.4183.121 Electron/10.1.3 Safari/537.36',
                        'Accept': '*/*',
                        'Origin': 'https://gorealraplayer.radio.sbs.co.kr',
                        'Sec-Fetch-Site': 'same-site',
                        'Sec-Fetch-Mode': 'cors',
                        'Sec-Fetch-Dest': 'empty',
                        'Referer': 'https://gorealraplayer.radio.sbs.co.kr/main.html?v=1.2.1',
                        'Accept-Encoding': 'gzip, deflate, br',
                        'Accept-Language': 'ko',
                        'If-None-Match': 'W/"134-0OoLHiGF4IrBKYLjJQzxNs0/11M"'
                    }
                })
                .then(response => {

                    resolve(response.data);
                }).catch(e => {
                    console.log(e)
                    resolve("invaild");
                })
        } catch {
            resolve("invaild");
        }
    })
}

liveServer.listen(port, '0.0.0.0', () => {
    console.log('Server running at http://0.0.0.0:3005');
});
