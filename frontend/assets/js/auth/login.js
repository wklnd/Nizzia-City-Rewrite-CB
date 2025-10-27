(() => {
  const { post, get } = window.NC_API;
  const { setUser, setPlayer } = window.NC_UTILS;

  document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('loginForm');
    const msg = document.getElementById('msg');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      msg.textContent = '';
      const body = {
        email: document.getElementById('email').value.trim(),
        password: document.getElementById('password').value
      };
      try {
        const data = await post('/auth/login', body);
        localStorage.setItem('nc_token', data.token);
        setUser(data.user);
        try {
          const p = await get(`/player/by-user/${data.user._id}`);
          setPlayer(p);
          window.location.href = '../game.html';
        } catch (e2) {
          if (e2.status === 404) window.location.href = 'create-player.html';
          else window.location.href = '../game.html';
        }
      } catch (err) {
        msg.textContent = err.message;
      }
    });
  });
})();
