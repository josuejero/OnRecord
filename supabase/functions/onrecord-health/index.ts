Deno.serve(() => {
  return new Response(JSON.stringify({ ok: true, service: 'onrecord-health' }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
