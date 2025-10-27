(() => {
  const { post } = window.NC_API;
  const { setUser } = window.NC_UTILS;

  document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('registerForm');
    const msg = document.getElementById('msg');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      msg.textContent = '';
      const body = {
        name: document.getElementById('name').value.trim(),
        email: document.getElementById('email').value.trim(),
        password: document.getElementById('password').value
      };
      try {
        const data = await post('/auth/register', body);
        setUser(data.user);
        window.location.href = 'create-player.html';
      } catch (err) {
        msg.textContent = err.message;
      }
    });
  });
})();
