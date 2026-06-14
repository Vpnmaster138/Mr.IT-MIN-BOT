/**
 * Song Downloader - Multiple APIs with fallback
 */

const yts = require('yt-search');
const axios = require('axios');
const { toAudio } = require('../../utils/converter');

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || '6302dd380amsh9115a6be5092cf2p1ca0e9jsn757c120ac58a';

// Extract YouTube video ID from any URL format
function extractVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([^&\s]{11})/,
    /(?:youtu\.be\/)([^?\s]{11})/,
    /(?:youtube\.com\/embed\/)([^?\s]{11})/,
    /(?:youtube\.com\/shorts\/)([^?\s]{11})/,
    /^([a-zA-Z0-9_-]{11})$/
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
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
          text: '🎵 Tumia: .song <jina la wimbo>\n\nMfano: .song Fally Ipupa'
        }, { quoted: msg });
      }

      // Tafuta video YouTube
      let video;
      if (text.includes('youtube.com') || text.includes('youtu.be')) {
        const id = extractVideoId(text);
        if (id) {
          try {
            const search = await yts({ videoId: id });
            video = { ...search, url: `https://www.youtube.com/watch?v=${id}`, videoId: id };
          } catch (e) {
            video = { url: text, title: 'Unknown', timestamp: '', videoId: id };
          }
        }
      } else {
        const search = await yts(text);
        if (!search?.videos?.length) {
          return await sock.sendMessage(chatId, {
            text: '❌ Wimbo haukupatikana. Jaribu jina tofauti.'
          }, { quoted: msg });
        }
        video = search.videos[0];
        video.videoId = extractVideoId(video.url);
      }

      if (!video) {
        return await sock.sendMessage(chatId, {
          text: '❌ Haikuweza kupata video. Jaribu tena.'
        }, { quoted: msg });
      }

      const videoId = video.videoId || extractVideoId(video.url);
      if (!videoId) {
        return await sock.sendMessage(chatId, {
          text: '❌ Video ID haikupatikana. Tuma YouTube link kamili.'
        }, { quoted: msg });
      }

      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

      await sock.sendMessage(chatId, {
        text: `⏳ Inadownload...\n\n🎵 *${video.title || text}*\n⏱️ ${video.timestamp || ''}`
      }, { quoted: msg });

      let audioBuffer = null;
      let songTitle = video.title || text;

      // ══════════════════════════════════════
      // API 1: youtube-mp36 (RapidAPI)
      // ══════════════════════════════════════
      if (!audioBuffer) {
        try {
          console.log(`API 1: Trying videoId=${videoId}`);
          const res = await axios.get('https://youtube-mp36.p.rapidapi.com/dl', {
            params: { id: videoId },
            headers: {
              'x-rapidapi-key': RAPIDAPI_KEY,
              'x-rapidapi-host': 'youtube-mp36.p.rapidapi.com'
            },
            timeout: 30000
          });

          console.log('API 1 response:', JSON.stringify(res.data).slice(0, 200));

          let dlUrl = res.data?.link;
          songTitle = res.data?.title || songTitle;

          if (!dlUrl && res.data?.status === 'processing') {
            await sock.sendMessage(chatId, { text: '⏳ Inachakata... subiri kidogo' }, { quoted: msg });
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
              console.log(`Poll ${i+1}:`, poll.data?.status, poll.data?.link?.slice(0,50));
              if (poll.data?.link) { dlUrl = poll.data.link; songTitle = poll.data.title || songTitle; break; }
            }
          }

          if (dlUrl) {
            const r = await axios.get(dlUrl, {
              responseType: 'arraybuffer',
              timeout: 120000,
              maxContentLength: Infinity
            });
            if (r.data?.byteLength > 0) {
              audioBuffer = Buffer.from(r.data);
              console.log('API 1 success! Size:', audioBuffer.length);
            }
          }
        } catch (e) {
          console.log('API 1 failed:', e.message, e.response?.status);
        }
      }

      // ══════════════════════════════════════
      // API 2: cobalt.tools (Free)
      // ══════════════════════════════════════
      if (!audioBuffer) {
        try {
          console.log('API 2: Trying cobalt.tools...');
          const res = await axios.post(
            'https://api.cobalt.tools/api/json',
            { url: videoUrl, aFormat: 'mp3', isAudioOnly: true },
            {
              headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
              timeout: 30000
            }
          );
          const dlUrl = res.data?.url;
          if (dlUrl) {
            const r = await axios.get(dlUrl, {
              responseType: 'arraybuffer',
              timeout: 120000,
              maxContentLength: Infinity
            });
            if (r.data?.byteLength > 0) {
              audioBuffer = Buffer.from(r.data);
              console.log('API 2 success! Size:', audioBuffer.length);
            }
          }
        } catch (e) {
          console.log('API 2 failed:', e.message);
        }
      }

      // ══════════════════════════════════════
      // API 3: yt5s.io (Free)
      // ══════════════════════════════════════
      if (!audioBuffer) {
        try {
          console.log('API 3: Trying yt5s.io...');
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
            const r = await axios.get(dlUrl, {
              responseType: 'arraybuffer',
              timeout: 120000,
              maxContentLength: Infinity
            });
            if (r.data?.byteLength > 0) {
              audioBuffer = Buffer.from(r.data);
              console.log('API 3 success! Size:', audioBuffer.length);
            }
          }
        } catch (e) {
          console.log('API 3 failed:', e.message);
        }
      }

      // ══════════════════════════════════════
      // API 4: snap.yt (Free)
      // ══════════════════════════════════════
      if (!audioBuffer) {
        try {
          console.log('API 4: Trying snap.yt...');
          const res = await axios.get(`https://snap.yt/api/?url=${encodeURIComponent(videoUrl)}`, {
            timeout: 20000
          });
          const dlUrl = res.data?.url?.mp3 || res.data?.mp3;
          if (dlUrl) {
            const r = await axios.get(dlUrl, {
              responseType: 'arraybuffer',
              timeout: 120000,
              maxContentLength: Infinity
            });
            if (r.data?.byteLength > 0) {
              audioBuffer = Buffer.from(r.data);
              console.log('API 4 success! Size:', audioBuffer.length);
            }
          }
        } catch (e) {
          console.log('API 4 failed:', e.message);
        }
      }

      // ══════════════════════════════════════
      // Zote zimefail
      // ══════════════════════════════════════
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

      // Tuma audio
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
