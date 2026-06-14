/**
 * Song Downloader - Multiple APIs with fallback
 */

const yts = require('yt-search');
const axios = require('axios');
const { toAudio } = require('../../utils/converter');

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || '6302dd380amsh9115a6be5092cf2p1ca0e9jsn757c120ac58a';

function extractVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([^&\s]{11})/,
    /(?:youtu\.be\/)([^?\s]{11})/,
    /(?:youtube\.com\/embed\/)([^?\s]{11})/,
    /(?:youtube\.com\/shorts\/)([^?\s]{11})/,
    /^([a-zA-Z0-9_-]{11})$/
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

async function downloadBuffer(url) {
  // Jaribu servers tofauti kwa link moja
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': '*/*',
    'Accept-Encoding': 'identity'
  };
  const r = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 120000,
    maxContentLength: Infinity,
    headers
  });
  if (r.data?.byteLength > 0) return Buffer.from(r.data);
  return null;
}

module.exports = {
  name: 'song',
  aliases: ['play', 'music', 'yta'],
  category: 'media',
  description: 'Download audio from YouTube',
  usage: '.song <song name or YouTube link>',

  async execute(sock, msg, args) {
    const chatId = msg.key.remoteJid;
    try {
      const text = args.join(' ');
      if (!text) {
        return await sock.sendMessage(chatId, {
          text: '🎵 Tumia: .song <jina la wimbo>\n\nMfano: .song Marioo Pombe'
        }, { quoted: msg });
      }

      // Tafuta video
      let video;
      if (text.includes('youtube.com') || text.includes('youtu.be')) {
        const id = extractVideoId(text);
        video = { url: `https://www.youtube.com/watch?v=${id}`, title: text, timestamp: '', videoId: id };
      } else {
        const search = await yts(text);
        if (!search?.videos?.length) {
          return await sock.sendMessage(chatId, { text: '❌ Wimbo haukupatikana.' }, { quoted: msg });
        }
        video = search.videos[0];
        video.videoId = extractVideoId(video.url);
      }

      const videoId = video.videoId;
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

      await sock.sendMessage(chatId, {
        text: `⏳ Inadownload...\n\n🎵 *${video.title}*\n⏱️ ${video.timestamp || ''}`
      }, { quoted: msg });

      let audioBuffer = null;
      let songTitle = video.title;

      // ══════════════════════════════════════
      // API 1: youtube-mp36 RapidAPI
      // Link inafika lakini server yao (123tokyo) inazuia
      // Tumia proxy/redirect kupitia link hiyo
      // ══════════════════════════════════════
      if (!audioBuffer) {
        try {
          const res = await axios.get('https://youtube-mp36.p.rapidapi.com/dl', {
            params: { id: videoId },
            headers: {
              'x-rapidapi-key': RAPIDAPI_KEY,
              'x-rapidapi-host': 'youtube-mp36.p.rapidapi.com'
            },
            timeout: 30000
          });

          let dlUrl = res.data?.link;
          songTitle = res.data?.title || songTitle;

          // Poll kama processing
          if (!dlUrl && res.data?.status === 'processing') {
            for (let i = 0; i < 8; i++) {
              await new Promise(r => setTimeout(r, 5000));
              const poll = await axios.get('https://youtube-mp36.p.rapidapi.com/dl', {
                params: { id: videoId },
                headers: {
                  'x-rapidapi-key': RAPIDAPI_KEY,
                  'x-rapidapi-host': 'youtube-mp36.p.rapidapi.com'
                },
                timeout: 30000
              });
              if (poll.data?.link) { dlUrl = poll.data.link; songTitle = poll.data.title || songTitle; break; }
            }
          }

          if (dlUrl) {
            // Jaribu download link moja kwa moja
            try {
              audioBuffer = await downloadBuffer(dlUrl);
              if (audioBuffer) console.log('API 1 direct success! Size:', audioBuffer.length);
            } catch (e) {
              console.log('API 1 direct failed:', e.message);
              // Jaribu kupitia allorigins proxy
              try {
                const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(dlUrl)}`;
                audioBuffer = await downloadBuffer(proxyUrl);
                if (audioBuffer) console.log('API 1 proxy success! Size:', audioBuffer.length);
              } catch (e2) {
                console.log('API 1 proxy failed:', e2.message);
              }
            }
          }
        } catch (e) {
          console.log('API 1 failed:', e.message);
        }
      }

      // ══════════════════════════════════════
      // API 2: YouTube MP3 via RapidAPI (mp3-youtube-dl)
      // ══════════════════════════════════════
      if (!audioBuffer) {
        try {
          console.log('API 2: Trying mp3-youtube-dl...');
          const res = await axios.get('https://mp3-youtube-dl.p.rapidapi.com/download/', {
            params: { url: videoUrl },
            headers: {
              'x-rapidapi-key': RAPIDAPI_KEY,
              'x-rapidapi-host': 'mp3-youtube-dl.p.rapidapi.com'
            },
            timeout: 60000,
            responseType: 'arraybuffer'
          });
          if (res.data?.byteLength > 0) {
            audioBuffer = Buffer.from(res.data);
            console.log('API 2 success! Size:', audioBuffer.length);
          }
        } catch (e) {
          console.log('API 2 failed:', e.message, e.response?.status);
        }
      }

      // ══════════════════════════════════════
      // API 3: cobalt.tools v2 (Free)
      // ══════════════════════════════════════
      if (!audioBuffer) {
        try {
          console.log('API 3: Trying cobalt.tools v2...');
          const res = await axios.post(
            'https://cobalt.api.timelessnesses.me/api/json',
            { url: videoUrl, aFormat: 'mp3', isAudioOnly: true },
            {
              headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
              timeout: 30000
            }
          );
          const dlUrl = res.data?.url;
          if (dlUrl) {
            audioBuffer = await downloadBuffer(dlUrl);
            if (audioBuffer) console.log('API 3 success! Size:', audioBuffer.length);
          }
        } catch (e) {
          console.log('API 3 failed:', e.message);
        }
      }

      // ══════════════════════════════════════
      // API 4: ytdl via n9tisrv (Free)
      // ══════════════════════════════════════
      if (!audioBuffer) {
        try {
          console.log('API 4: Trying n9tisrv...');
          const res = await axios.get(
            `https://n9tisrv.com/api/youtube/mp3?url=${encodeURIComponent(videoUrl)}`,
            { timeout: 30000 }
          );
          const dlUrl = res.data?.url || res.data?.download;
          if (dlUrl) {
            audioBuffer = await downloadBuffer(dlUrl);
            if (audioBuffer) console.log('API 4 success! Size:', audioBuffer.length);
          }
        } catch (e) {
          console.log('API 4 failed:', e.message);
        }
      }

      // ══════════════════════════════════════
      // API 5: SaveFrom (Free)
      // ══════════════════════════════════════
      if (!audioBuffer) {
        try {
          console.log('API 5: Trying savefrom...');
          const res = await axios.get(
            `https://worker.sf-tools.com/savefrom.php?sf_url=${encodeURIComponent(videoUrl)}`,
            {
              headers: { 'X-Requested-With': 'XMLHttpRequest' },
              timeout: 20000
            }
          );
          const formats = res.data?.url;
          if (formats && Array.isArray(formats)) {
            const mp3 = formats.find(f => f.ext === 'mp3');
            if (mp3?.url) {
              audioBuffer = await downloadBuffer(mp3.url);
              if (audioBuffer) console.log('API 5 success! Size:', audioBuffer.length);
            }
          }
        } catch (e) {
          console.log('API 5 failed:', e.message);
        }
      }

      if (!audioBuffer || audioBuffer.length === 0) {
        return await sock.sendMessage(chatId, {
          text: '❌ Imeshindwa kudownload wimbo huu.\n\nJaribu:\n• YouTube link moja kwa moja\n• Wimbo mwingine'
        }, { quoted: msg });
      }

      // Convert kama si MP3
      let finalBuffer = audioBuffer;
      const sig4 = audioBuffer.slice(4, 8).toString('ascii');
      const sig0 = audioBuffer.slice(0, 4).toString('ascii');
      if (sig4 === 'ftyp') finalBuffer = await toAudio(audioBuffer, 'm4a');
      else if (sig0 === 'OggS') finalBuffer = await toAudio(audioBuffer, 'ogg');
      else if (sig0 === 'RIFF') finalBuffer = await toAudio(audioBuffer, 'wav');

      const title = (songTitle || 'song').replace(/[^\w\s-]/g, '').trim();
      await sock.sendMessage(chatId, {
        audio: finalBuffer,
        mimetype: 'audio/mpeg',
        fileName: `${title}.mp3`,
        ptt: false
      }, { quoted: msg });

    } catch (err) {
      console.error('Song command error:', err.message);
      await sock.sendMessage(chatId, {
        text: '❌ Hitilafu imetokea. Jaribu tena baadaye.'
      }, { quoted: msg });
    }
  }
};
