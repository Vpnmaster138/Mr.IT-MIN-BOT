/**
 * Song Downloader - Multiple APIs with fallback
 */

const yts = require('yt-search');
const axios = require('axios');
const { toAudio } = require('../../utils/converter');

// ── API Keys ──
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || '6302dd380amsh9115a6be5092cf2p1ca0e9jsn757c120ac58a';

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
        const id = text.match(/(?:v=|youtu\.be\/)([^&\s]+)/)?.[1];
        const search = await yts({ videoId: id });
        video = { ...search, url: text };
      } else {
        const search = await yts(text);
        if (!search?.videos?.length) {
          return await sock.sendMessage(chatId, {
            text: '❌ Wimbo haukupatikana. Jaribu jina tofauti.'
          }, { quoted: msg });
        }
        video = search.videos[0];
      }

      // Notify user
      await sock.sendMessage(chatId, {
        text: `⏳ Inadownload...\n\n🎵 *${video.title}*\n⏱️ ${video.timestamp || ''}`
      }, { quoted: msg });

      const videoId = video.url.match(/(?:v=|youtu\.be\/)([^&\s]+)/)?.[1];
      if (!videoId) throw new Error('Video ID haikupatikana');

      let audioBuffer = null;
      let songTitle = video.title;

      // ══════════════════════════════════════
      // API 1: youtube-mp36 (RapidAPI) - Reliable sana
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

          // Poll kama bado inachakata
          if (!dlUrl && res.data?.status === 'processing') {
            for (let i = 0; i < 6; i++) {
              await new Promise(r => setTimeout(r, 5000));
              const poll = await axios.get('https://youtube-mp36.p.rapidapi.com/dl', {
                params: { id: videoId },
                headers: {
                  'x-rapidapi-key': RAPIDAPI_KEY,
                  'x-rapidapi-host': 'youtube-mp36.p.rapidapi.com'
                },
                timeout: 30000
              });
              if (poll.data?.link) { dlUrl = poll.data.link; break; }
            }
          }

          if (dlUrl) {
            const r = await axios.get(dlUrl, {
              responseType: 'arraybuffer',
              timeout: 90000,
              maxContentLength: Infinity
            });
            if (r.data?.byteLength > 0) audioBuffer = Buffer.from(r.data);
          }
        } catch (e) {
          console.log('API 1 failed:', e.message);
        }
      }

      // ══════════════════════════════════════
      // API 2: cobalt.tools (Free, no key)
      // ══════════════════════════════════════
      if (!audioBuffer) {
        try {
          const res = await axios.post(
            'https://api.cobalt.tools/api/json',
            { url: video.url, aFormat: 'mp3', isAudioOnly: true },
            {
              headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
              timeout: 30000
            }
          );
          const dlUrl = res.data?.url;
          if (dlUrl) {
            const r = await axios.get(dlUrl, {
              responseType: 'arraybuffer',
              timeout: 90000,
              maxContentLength: Infinity
            });
            if (r.data?.byteLength > 0) audioBuffer = Buffer.from(r.data);
          }
        } catch (e) {
          console.log('API 2 failed:', e.message);
        }
      }

      // ══════════════════════════════════════
      // API 3: y2mate.guru (Free, no key)
      // ══════════════════════════════════════
      if (!audioBuffer) {
        try {
          const res1 = await axios.post(
            'https://www.y2mate.com/mates/analyzeV2/ajax',
            `k_query=${encodeURIComponent(video.url)}&k_page=Youtube&hl=en&q_auto=1`,
            {
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              timeout: 20000
            }
          );
          const vid = res1.data?.vid;
          if (vid) {
            const res2 = await axios.post(
              'https://www.y2mate.com/mates/convertV2/index',
              `vid=${vid}&k=mp3`,
              {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                timeout: 20000
              }
            );
            const dlUrl = res2.data?.dlink;
            if (dlUrl) {
              const r = await axios.get(dlUrl, {
                responseType: 'arraybuffer',
                timeout: 90000,
                maxContentLength: Infinity
              });
              if (r.data?.byteLength > 0) audioBuffer = Buffer.from(r.data);
            }
          }
        } catch (e) {
          console.log('API 3 failed:', e.message);
        }
      }

      // ══════════════════════════════════════
      // API 4: yt5s.io (Free, no key)
      // ══════════════════════════════════════
      if (!audioBuffer) {
        try {
          const res1 = await axios.post(
            'https://yt5s.io/api/ajaxSearch',
            `q=${encodeURIComponent(video.url)}&vt=mp3`,
            {
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Requested-With': 'XMLHttpRequest'
              },
              timeout: 20000
            }
          );
          const links = res1.data?.links?.mp3;
          const dlUrl = links?.mp3128?.url || links?.mp3?.url;
          if (dlUrl) {
            const r = await axios.get(dlUrl, {
              responseType: 'arraybuffer',
              timeout: 90000,
              maxContentLength: Infinity
            });
            if (r.data?.byteLength > 0) audioBuffer = Buffer.from(r.data);
          }
        } catch (e) {
          console.log('API 4 failed:', e.message);
        }
      }

      // ══════════════════════════════════════
      // Hakuna API iliyofanya kazi
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
