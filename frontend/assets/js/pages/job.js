(() => {
  const { post, get } = window.NC_API;
  const { ensurePlayerLoaded, setPlayer } = window.NC_UTILS;

  function describeJob(player) {
    if (!player?.job?.jobId) return 'Unemployed';
    const rank = player.job.jobRank ?? 0;
    return `Job ID: ${player.job.jobId}, Rank: ${rank}`;
  }

  document.addEventListener('DOMContentLoaded', async () => {
    window.NC_UI?.init();
    const ctx = await ensurePlayerLoaded();
    if (!ctx) return;
    let { user, player } = ctx;
    window.NC_UI?.updateHP(player);
    const info = document.getElementById('job-info');
    const msg = document.getElementById('job-msg');
    const refresh = async () => {
      try { player = await get(`/player/by-user/${user._id}`); setPlayer(player); } catch (_) {}
      info.textContent = describeJob(player);
    };
    await refresh();

    document.getElementById('btn-hire-army').addEventListener('click', async () => {
      msg.textContent = '';
      try {
        await post('/job/hire', { userId: user._id, jobId: 1 });
        msg.textContent = 'Hired into Army.';
        await refresh();
      } catch (e) { msg.textContent = e.message; }
    });
    document.getElementById('btn-promote').addEventListener('click', async () => {
      msg.textContent = '';
      try {
        await post('/job/promote', { playerId: player.id });
        msg.textContent = 'Promoted (if requirements met).';
        await refresh();
      } catch (e) { msg.textContent = e.message; }
    });
    document.getElementById('btn-leave').addEventListener('click', async () => {
      msg.textContent = '';
      try {
        await post('/job/leave', { playerId: player.id });
        msg.textContent = 'Left job.';
        await refresh();
      } catch (e) { msg.textContent = e.message; }
    });
  });
})();
