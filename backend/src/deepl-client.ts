export function createDeepLTranslator(apiKey: string) {
  return async (word: string, sentence: string): Promise<string> => {
    const res = await fetch("https://api-free.deepl.com/v2/translate", {
      method: "POST",
      headers: {
        Authorization: `DeepL-Auth-Key ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: [word], target_lang: "PL", context: sentence }),
    });

    if (!res.ok) throw new Error(`DeepL error: ${res.status}`);

    const data = (await res.json()) as { translations: { text: string }[] };
    return data.translations[0].text;
  };
}
