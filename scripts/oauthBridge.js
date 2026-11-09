const http = require('http');

const PORT = 5173;
const GOOGLE_CLIENT_ID = '340055145050-thlfrv3nl1j1jcahh75n8inr8v5j4574.apps.googleusercontent.com';

const HTML_CONTENT = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Wayfare Google OAuth Bridge</title>
  <script src="https://accounts.google.com/gsi/client" async defer></script>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #FAF8F5;
      color: #1E1A15;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
      box-sizing: border-box;
    }
    .card {
      background: #FFFFFF;
      border: 1px solid #E8E2D9;
      border-radius: 16px;
      padding: 32px 24px;
      max-width: 420px;
      width: 100%;
      text-align: center;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
    }
    .logo {
      font-size: 26px;
      font-weight: 800;
      color: #C07040;
      letter-spacing: -0.5px;
      margin-bottom: 12px;
    }
    .spinner {
      width: 36px;
      height: 36px;
      border: 3px solid rgba(192, 112, 64, 0.2);
      border-top-color: #C07040;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 20px auto;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .status {
      font-size: 15px;
      font-weight: 600;
      color: #2D2721;
      margin: 12px 0 6px 0;
    }
    .subtext {
      font-size: 13px;
      color: #7D7368;
      line-height: 1.5;
    }
    .btn {
      display: inline-block;
      margin-top: 16px;
      background: #C07040;
      color: #FFFFFF;
      padding: 10px 20px;
      border-radius: 9999px;
      text-decoration: none;
      font-size: 14px;
      font-weight: 600;
      border: none;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">Wayfare</div>
    <div id="spinner" class="spinner"></div>
    <div id="status" class="status">Đang mở xác thực Google...</div>
    <div id="subtext" class="subtext">Vui lòng chọn tài khoản Google của bạn để đăng nhập vào Wayfare.</div>
    <button id="retryBtn" class="btn" style="display:none;" onclick="triggerGsi()">Chọn tài khoản Google</button>
  </div>

  <script>
    var clientId = '${GOOGLE_CLIENT_ID}';
    var tokenClient = null;

    function notifyOpener(token) {
      document.getElementById('spinner').style.display = 'none';
      document.getElementById('status').innerText = '✅ Đăng nhập thành công!';
      document.getElementById('subtext').innerText = 'Đang chuyển kết quả về ứng dụng Wayfare...';
      
      try {
        if (window.opener) {
          window.opener.postMessage({
            type: 'WAYFARE_GOOGLE_AUTH_SUCCESS',
            token: token
          }, '*');
        }
      } catch (err) {
        console.error('Lỗi khi gửi message về opener:', err);
      }

      try {
        localStorage.setItem('wayfare_oauth_token', token);
      } catch (e) {}

      setTimeout(function() {
        window.close();
      }, 500);
    }

    function triggerGsi() {
      if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
        document.getElementById('status').innerText = 'Đang kết nối thư viện Google...';
        setTimeout(triggerGsi, 500);
        return;
      }

      try {
        if (!tokenClient) {
          tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: 'email profile openid',
            callback: function(res) {
              if (res && res.access_token) {
                notifyOpener(res.access_token);
              } else if (res && res.error) {
                document.getElementById('spinner').style.display = 'none';
                document.getElementById('status').innerText = 'Đăng nhập Google bị hủy';
                document.getElementById('subtext').innerText = res.error_description || res.error;
                document.getElementById('retryBtn').style.display = 'inline-block';
              }
            }
          });
        }
        tokenClient.requestAccessToken();
      } catch (e) {
        console.error('GSI Init Error:', e);
        document.getElementById('spinner').style.display = 'none';
        document.getElementById('status').innerText = 'Cần bấm để tiếp tục';
        document.getElementById('retryBtn').style.display = 'inline-block';
      }
    }

    // Check if redirect response returned in hash
    (function checkHash() {
      var hash = window.location.hash || '';
      var search = window.location.search || '';
      var params = new URLSearchParams(hash.substring(1) || search.substring(1));
      var token = params.get('access_token') || params.get('id_token');
      if (token) {
        notifyOpener(token);
        return;
      }

      // Check if auto trigger requested
      window.onload = function() {
        setTimeout(triggerGsi, 300);
      };
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

  if (typeof server.unref === 'function') {
    server.unref();
  }

  return server;
}

if (require.main === module) {
  startBridge();
}

module.exports = { startBridge };
