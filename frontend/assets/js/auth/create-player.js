(() => {
  const { post } = window.NC_API;
  const { getUser, setPlayer } = window.NC_UTILS;

  document.addEventListener('DOMContentLoaded', () => {
    const user = getUser();
    if (!user || !user._id) { window.location.href = 'login.html'; return; }
    const form = document.getElementById('playerForm');
    const msg = document.getElementById('msg');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      msg.textContent = '';
      const body = {
        name: document.getElementById('playerName').value.trim(),
        gender: document.getElementById('gender').value,
        userId: user._id
      };
      try {
        const data = await post('/player/create', body);
        setPlayer(data);
        window.location.href = '../game.html';
      } catch (err) {
        msg.textContent = err.message;
      }
    });
  });
})();
