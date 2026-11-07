const http = require('http');

const PORT = 5173;

const HTML_CONTENT = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Wayfare Google Auth Bridge</title>
</head>
<body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#FAF8F5;color:#1E1A15;">
  <div style="text-align:center;padding:24px;">
    <h3 style="margin-bottom:8px;">✅ Đăng nhập Google thành công!</h3>
    <p style="color:#666;font-size:14px;">Đang kết nối lại form ứng dụng Wayfare...</p>
  </div>
  <script>
    (function() {
      try {
        var hash = window.location.hash || '';
        var search = window.location.search || '';
        var rawParams = hash.substring(1) || search.substring(1);
        var params = new URLSearchParams(rawParams);
        var token = params.get('id_token') || params.get('access_token');

        if (window.opener && token) {
          window.opener.postMessage({
            type: 'WAYFARE_GOOGLE_AUTH_SUCCESS',
            token: token
          }, '*');
          setTimeout(function() { window.close(); }, 350);
        } else if (token) {
          localStorage.setItem('wayfare_oauth_token', token);
          document.body.innerHTML = '<div style="text-align:center;padding:24px;"><h3>Đã nhận diện token!</h3><p>Vui lòng quay lại tab ứng dụng.</p></div>';
        }
      } catch (e) {
        console.warn('OAuth Bridge error:', e);
      }
    })();
  </script>
</body>
</html>`;

function startBridge() {
  const server = http.createServer((req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(HTML_CONTENT);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${PORT} is already in use by another process.`);
    } else {
      console.error('Bridge error:', err);
    }
  });

  server.listen(PORT, () => {
    console.log(`[Wayfare OAuth Bridge] Listening on http://localhost:${PORT}`);
  });

  return server;
}

if (require.main === module) {
  startBridge();
}

module.exports = { startBridge };
