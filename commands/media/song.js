/**
 * Song Downloader - Download audio from YouTube
 */

const yts = require('yt-search');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { toAudio } = require('../../utils/converter');

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || '6302dd380amsh9115a6be5092cf2p1ca0e9jsn757c120ac58a';

function extractVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([^&\s]{11})/,
    /(?:youtu\.be\/)([^?\s]{11})/,
    /(?:youtube\.com\/shorts\/)([^?\s]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

// Download buffer kwa URL — jaribu direct kisha stream
async function fetchBuffer(url) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Accept-Encoding': 'identity'
  };

  // Jaribu arraybuffer kwanza
  try {
    const r = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 90000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      validateStatus: s => s >= 200 && s < 400,
      headers
    });
    const buf = Buffer.from(r.data);
    if (buf.length > 0) return buf;
  } catch (e) {
    if (e.response?.status === 451) throw new Error('blocked_451');
  }

  // Jaribu stream mode
  const r2 = await axios.get(url, {
    responseType: 'stream',
    timeout: 90000,
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
    validateStatus: s => s >= 200 && s < 400,
    headers
  });
  const chunks = [];
  await new Promise((resolve, reject) => {
    r2.data.on('data', c => chunks.push(c));
    r2.data.on('end', resolve);
    r2.data.on('error', reject);
  });
  const buf = Buffer.concat(chunks);
  if (buf.length > 0) return buf;
  return null;
}

module.exports = {
  name: 'song',
  aliases: ['play', 'music', 'yta'],
  category: 'media',
  description: 'Download audio from YouTube',
  usage: '.song <song name or YouTube link>',

  async execute(sock, msg, args) {
    try {
      const text = args.join(' ');
      const chatId = msg.key.remoteJid;

      if (!text) {
        return await sock.sendMessage(chatId, {
          text: '🎵 Tumia: .song <jina la wimbo>\n\nMfano: .song Marioo Pombe'
        }, { quoted: msg });
      }

      let video;
      if (text.includes('youtube.com') || text.includes('youtu.be')) {
        const id = extractVideoId(text);
        try {
          const s = await yts({ videoId: id });
          video = { ...s, url: `https://www.youtube.com/watch?v=${id}` };
        } catch (e) {
          video = { url: `https://www.youtube.com/watch?v=${id}`, title: text, timestamp: '' };
        }
      } else {
        const search = await yts(text);
        if (!search?.videos?.length) {
          return await sock.sendMessage(chatId, { text: '❌ Wimbo haukupatikana. Jaribu jina tofauti.' }, { quoted: msg });
        }
        video = search.videos[0];
      }

      const videoId = extractVideoId(video.url);
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

      // Inform user
      await sock.sendMessage(chatId, {
        image: { url: video.thumbnail || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` },
        caption: `🎵 Downloading: *${video.title}*\n⏱ Duration: ${video.timestamp || ''}`
      }, { quoted: msg });

      let audioBuffer = null;
      let audioTitle = video.title || text;
      let downloadSuccess = false;

      // ══ API 1: youtube-mp36 RapidAPI ══
      if (!downloadSuccess) {
        try {
          console.log('API 1: youtube-mp36, videoId=' + videoId);
          const res = await axios.get('https://youtube-mp36.p.rapidapi.com/dl', {
            params: { id: videoId },
            headers: {
              'x-rapidapi-key': RAPIDAPI_KEY,
              'x-rapidapi-host': 'youtube-mp36.p.rapidapi.com'
            },
            timeout: 30000
          });

          let dlUrl = res.data?.link;
          audioTitle = res.data?.title || audioTitle;

          // Poll kama bado inachakata
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
              if (poll.data?.link) {
                dlUrl = poll.data.link;
                audioTitle = poll.data.title || audioTitle;
                break;
              }
            }
          }

          if (dlUrl) {
            // Jaribu download moja kwa moja
            try {
              audioBuffer = await fetchBuffer(dlUrl);
            } catch (e) {
              // Jaribu kupitia proxy
              try {
                const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(dlUrl)}`;
                audioBuffer = await fetchBuffer(proxyUrl);
              } catch (e2) {}
            }
            if (audioBuffer?.length > 0) {
              downloadSuccess = true;
              console.log('API 1 success! Size:', audioBuffer.length);
            }
          }
        } catch (e) {
          console.log('API 1 failed:', e.message);
        }
      }

      // ══ API 2: mp3-youtube-dl RapidAPI ══
      if (!downloadSuccess) {
        try {
          console.log('API 2: mp3-youtube-dl...');
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
            downloadSuccess = true;
            console.log('API 2 success! Size:', audioBuffer.length);
          }
        } catch (e) {
          console.log('API 2 failed:', e.message, e.response?.status);
        }
      }

      // ══ API 3: cobalt.tools (Free) ══
      if (!downloadSuccess) {
        try {
          console.log('API 3: cobalt.tools...');
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
            audioBuffer = await fetchBuffer(dlUrl);
            if (audioBuffer?.length > 0) {
              downloadSuccess = true;
              console.log('API 3 success! Size:', audioBuffer.length);
            }
          }
        } catch (e) {
          console.log('API 3 failed:', e.message);
        }
      }

      // ══ API 4: yt5s.io (Free) ══
      if (!downloadSuccess) {
        try {
          console.log('API 4: yt5s.io...');
          const res1 = await axios.post(
            'https://yt5s.io/api/ajaxSearch',
            `q=${encodeURIComponent(videoUrl)}&vt=mp3`,
            {
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Requested-With': 'XMLHttpRequest',
                'Origin': 'https://yt5s.io',
                'Referer': 'https://yt5s.io/'
              },
              timeout: 20000
            }
          );
          const links = res1.data?.links?.mp3;
          const dlUrl = links?.mp3128?.url || links?.mp3320?.url || links?.mp3?.url;
          if (dlUrl) {
            audioBuffer = await fetchBuffer(dlUrl);
            if (audioBuffer?.length > 0) {
              downloadSuccess = true;
              console.log('API 4 success! Size:', audioBuffer.length);
            }
          }
        } catch (e) {
          console.log('API 4 failed:', e.message);
        }
      }

      // ══ Zote zimefail ══
      if (!downloadSuccess || !audioBuffer) {
        throw new Error('All download sources failed. The content may be unavailable or blocked in your region.');
      }

      if (!audioBuffer || audioBuffer.length === 0) {
        throw new Error('Downloaded audio buffer is empty');
      }

      // Detect format
      const firstBytes = audioBuffer.slice(0, 12);
      const hexSignature = firstBytes.toString('hex');
      const asciiSignature = firstBytes.toString('ascii', 4, 8);

      let actualMimetype = 'audio/mpeg';
      let fileExtension = 'mp3';
      let detectedFormat = 'unknown';

      if (asciiSignature === 'ftyp' || hexSignature.startsWith('000000')) {
        const ftypBox = audioBuffer.slice(4, 8).toString('ascii');
        if (ftypBox === 'ftyp') {
          detectedFormat = 'M4A/MP4';
          actualMimetype = 'audio/mp4';
          fileExtension = 'm4a';
        }
      } else if (audioBuffer.toString('ascii', 0, 3) === 'ID3' ||
        (audioBuffer[0] === 0xFF && (audioBuffer[1] & 0xE0) === 0xE0)) {
        detectedFormat = 'MP3';
        actualMimetype = 'audio/mpeg';
        fileExtension = 'mp3';
      } else if (audioBuffer.toString('ascii', 0, 4) === 'OggS') {
        detectedFormat = 'OGG/Opus';
        actualMimetype = 'audio/ogg; codecs=opus';
        fileExtension = 'ogg';
      } else if (audioBuffer.toString('ascii', 0, 4) === 'RIFF') {
        detectedFormat = 'WAV';
        actualMimetype = 'audio/wav';
        fileExtension = 'wav';
      } else {
        actualMimetype = 'audio/mp4';
        fileExtension = 'm4a';
        detectedFormat = 'Unknown (defaulting to M4A)';
      }

      // Convert to MP3 if needed
      let finalBuffer = audioBuffer;
      let finalMimetype = 'audio/mpeg';
      let finalExtension = 'mp3';

      if (fileExtension !== 'mp3') {
        try {
          finalBuffer = await toAudio(audioBuffer, fileExtension);
          if (!finalBuffer || finalBuffer.length === 0) throw new Error('Conversion returned empty buffer');
          finalMimetype = 'audio/mpeg';
          finalExtension = 'mp3';
        } catch (convErr) {
          throw new Error(`Failed to convert ${detectedFormat} to MP3: ${convErr.message}`);
        }
      }

      // Send audio
      await sock.sendMessage(chatId, {
        audio: finalBuffer,
        mimetype: finalMimetype,
        fileName: `${(audioTitle || video.title || 'song').replace(/[^\w\s-]/g, '')}.${finalExtension}`,
        ptt: false
      }, { quoted: msg });

      // Cleanup temp files
      try {
        const tempDir = path.join(__dirname, '../../temp');
        if (fs.existsSync(tempDir)) {
          const files = fs.readdirSync(tempDir);
          const now = Date.now();
          files.forEach(file => {
            const filePath = path.join(tempDir, file);
            try {
              const stats = fs.statSync(filePath);
              if (now - stats.mtimeMs > 10000) {
                if (file.endsWith('.mp3') || file.endsWith('.m4a') || /^\d+\.(mp3|m4a)$/.test(file)) {
                  fs.unlinkSync(filePath);
                }
              }
            } catch (e) {}
          });
        }
      } catch (cleanupErr) {}

    } catch (err) {
      console.error('Song command error:', err);

      let errorMessage = '❌ Failed to download song.';
      if (err.message?.includes('blocked')) {
        errorMessage = '❌ Download blocked. The content may be unavailable in your region.';
      } else if (err.response?.status === 451 || err.status === 451) {
        errorMessage = '❌ Content unavailable (451). Regional restrictions apply.';
      } else if (err.message?.includes('All download sources failed')) {
        errorMessage = '❌ All download sources failed. Jaribu wimbo mwingine.';
      }

      await sock.sendMessage(msg.key.remoteJid, { text: errorMessage }, { quoted: msg });
    }
  }
};
