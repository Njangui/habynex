const pushResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/push-notify`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`, // si vous avez laissé la vérification JWT, sinon mettez un secret
  },
  body: JSON.stringify({
    userId: "uuid-de-l-utilisateur",
    title: "💬 Nouveau message",
    body: "Vous avez reçu un message de Jean",
    data: { url: "/messages" }
  })
});