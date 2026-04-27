import OpenAI from "openai";
import { NextResponse } from "next/server";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type FullMeldingPayload = {
  Mode: "FULL_MELDING";
  Kontekst: string;
  Alvorlighetsnivå: string;
  Oppfølging: string;
  Referanseform: "Eleven" | "Barnet" | "Bruk navn";
  Elevnavn?: string;
  Råtekst: string;
};

type Payload = FullMeldingPayload;

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function serverError(message: string) {
  return NextResponse.json({ error: message }, { status: 500 });
}

function buildPrompt(p: FullMeldingPayload): string {
  const mildRules = [
    "Vær mild, støttende og samarbeidsorientert.",
    "Vis omsorg for elevens trivsel og mestring.",
    "Unngå at teksten fremstår som en oppramsing av negative hendelser.",
    "Bruk forsiktig frekvensspråk som 'i noen situasjoner', 'ved enkelte anledninger' eller 'innimellom', med mindre råteksten tydelig sier noe annet.",
    "Ikke øk alvorlighetsgrad utover det råteksten støtter.",
  ].join(" ");

  const clearRules = [
    "Vær tydelig, rolig og ansvarlig. Formidle bekymring uten dramatikk.",
    "Vær konkret på hva som er observert, og foreslå ett klart neste steg.",
    "Unngå anklagende formuleringer. Inviter til samarbeid.",
  ].join(" ");

  const severityRules =
    p.Alvorlighetsnivå === "Tydelig / bekymringsformidling" ? clearRules : mildRules;

  const followUpRules = `
Tilpass KUN avslutningen til ønsket oppfølging: "${p.Oppfølging}".

Regler (må følges):
- Hvis "Kun til informasjon":
  - Avslutt med at dette deles til orientering.
  - Det er OK å skrive "Ta gjerne kontakt ved behov/spørsmål".
  - IKKE foreslå telefonsamtale, møte eller "kort prat".
- Hvis "Kort telefonsamtale":
  - Avslutt med en tydelig forespørsel om en kort telefonsamtale når det passer.
- Hvis "Foreslå møte":
  - Avslutt med et tydelig forslag om møte/samtale + forslag om å avtale tidspunkt.
- Hvis "Åpen dialog (AI velger)":
  - Avslutt med en mild invitasjon til dialog uten å være påtrengende.
`.trim();

  const referenceRules = `
Hvordan skal eleven omtales i meldingen:
- Referanseform: "${p.Referanseform}"
- Elevens fornavn (hvis oppgitt): "${(p.Elevnavn || "").trim()}"

Regler:
- Hvis Referanseform er "Eleven": bruk "eleven".
- Hvis Referanseform er "Barnet": bruk "barnet".
- Hvis Referanseform er "Bruk navn" og et fornavn er oppgitt:
  - Bruk fornavnet maks 1–2 ganger (typisk første gang), og bruk deretter "eleven".
- Hvis Referanseform er "Bruk navn" men navnet mangler/er tomt: bruk "eleven".
- Ikke bruk etternavn eller andre identifiserende opplysninger.
`.trim();

  return `
Du er en profesjonell skriveassistent for lærere. Du skriver meldinger som kan sendes til foresatte.

Mål:
- Formidle konkrete observasjoner fra skolen på en trygg, respektfull og samarbeidsorientert måte.
- Gi foresatte nok informasjon til å forstå situasjonen, uten spekulasjon.
- Barnets beste er grunnleggende: meldingen skal vise omsorg for elevens trivsel og læring.

Sikkerhetsregler (må følges strengt):
- Bruk KUN informasjon fra råteksten. Ikke gjett, ikke legg til detaljer, ikke generaliser utover teksten.
- Råteksten kan være stikkord, ufullstendige setninger eller korte notater. Bruk dem som grunnlag, men ikke finn på detaljer.
- Ikke legg inn tidspunkt, frekvens, årsak eller sted med mindre det står eksplisitt i råteksten.
- Output skal alltid være profesjonell og pedagogisk, uavhengig av hvordan råteksten er skrevet.
- Ikke gjengi uformelle, ladede eller lite profesjonelle uttrykk direkte (f.eks. "tull og fjas", "gidder ikke", "sutrer").
  Slike uttrykk skal alltid omformuleres til nøytralt og profesjonelt språk med samme faktiske betydning.
- Output skal aldri inneholde slang, muntlige uttrykk eller dagligtale.
- Ikke bruk diagnose-, medisinske eller psykologiske begreper.
- Unngå tolkninger av intensjon/motivasjon med mindre det står eksplisitt.
- Ikke moraliser. Ikke legg skyld på eleven eller foresatte. Ikke tru med konsekvenser.

Kontekst: ${p.Kontekst}
Alvorlighetsnivå: ${p.Alvorlighetsnivå}
Stilføringer: ${severityRules}

${referenceRules}

Ønsket oppfølging:
${followUpRules}

Råtekst (lærerens observasjon):
${p.Råtekst}

Oppgave:
Skriv ett ferdig meldingsforslag på norsk som kan sendes til foresatte.

Formkrav:
- 1–2 korte avsnitt.
- 70–170 ord (kortere er ok hvis råteksten er veldig kort).
- Ingen overskrift. Ingen punktliste. Ingen emojis. Ingen metatekst.
- Rolig, profesjonell språkføring.

Innhold/struktur (må være med):
1) Kort åpning som setter kontekst (hvorfor du skriver nå).
2) 1–4 konkrete observasjoner (fakta: hva som ble sett/hørt, når/hvordan hvis oppgitt, uten tolkning).
3) Avslutt i tråd med ønsket oppfølging. For "Kun til informasjon" skal avslutningen IKKE foreslå prat/møte/telefon.

Sjekk før du svarer (gjør dette stille):
- Er alt i teksten forankret i råteksten?
- Er språk og tone profesjonell, respektfull og pedagogisk?
- Viser teksten omsorg (barnets beste), spesielt ved mild alvorlighet?
- Overholder teksten formkravene?

Returner KUN selve meldingen.
`.trim();
}

export async function POST(req: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return serverError("Mangler OPENAI_API_KEY i .env.local");
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Ugyldig JSON.");
  }

  const p = body as Partial<Payload>;
  if (p.Mode !== "FULL_MELDING") return badRequest("Ugyldig Mode.");

  const b = body as FullMeldingPayload;

  if (!b.Råtekst || b.Råtekst.trim().length < 10)
    return badRequest("Råtekst må være minst 10 tegn.");
  if (!b.Kontekst) return badRequest("Mangler Kontekst.");
  if (!b.Alvorlighetsnivå) return badRequest("Mangler Alvorlighetsnivå.");
  if (!b.Oppfølging) return badRequest("Mangler Oppfølging.");
  if (!b.Referanseform) return badRequest("Mangler Referanseform.");

  // Navn er valgfritt (fallback håndteres i promptreglene)
  const prompt = buildPrompt(b);

  try {
    const response = await client.responses.create({
      model: "gpt-5.2",
      input: prompt,
    });

    return NextResponse.json({ text: response.output_text });
  } catch {
    return serverError("AI-tjenesten er midlertidig utilgjengelig. Prøv igjen.");
  }
}