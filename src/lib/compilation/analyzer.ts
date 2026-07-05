// ==================== ANALIZADOR DE REQUISITOS ====================
// Extrae requisitos de compilación desde el objetivo del usuario.

import type { AppRequirements, AppType } from "./types";

export function extractRequirements(objective: string): AppRequirements {
  const lower = objective.toLowerCase();

  // Detectar tipo de aplicación
  let type: AppType = "utility";
  if (/juego|game|plataformas|arcade|rpg/i.test(lower)) type = "game";
  else if (/chat|red social|social|mensajer[ií]a|comunicaci/i.test(lower)) type = "mobile";
  else if (/empresa|empresarial|gesti[oó]n|crm|erp|project/i.test(lower)) type = "enterprise";
  else if (/m[oó]vil|android|ios|phone/i.test(lower)) type = "mobile";
  else if (/escritorio|desktop|windows|linux|mac/i.test(lower)) type = "desktop";
  else if (/web|navegador|p[aá]gina/i.test(lower)) type = "web";

  // Detectar características
  const features: AppRequirements["features"] = {
    camera: /c[aá]mara|foto|video|streaming/i.test(lower),
    gps: /gps|ubicaci[oó]n|mapa|localizaci[oó]n/i.test(lower),
    offline: /offline|sin conexi[oó]n|local/i.test(lower),
    realtime: /tiempo real|realtime|chat|notificaci/i.test(lower),
    ai: /ia|ai|inteligencia artificial|machine learning|ml/i.test(lower),
    graphics: "basic",
  };

  if (/3d|three|three.js|unity|unreal/i.test(lower)) features.graphics = "3d";
  else if (/2d|sprite|plataformas|arcade/i.test(lower)) features.graphics = "2d";

  // Detectar rendimiento
  const targetUsers = extractNumber(lower, /(\d+)\s*(usuarios|users|k|miles|millones)/i) || 1000;
  let dataProcessing: AppRequirements["performance"]["dataProcessing"] = "light";
  if (/pesado|heavy|big data|millones|masivo/i.test(lower)) dataProcessing = "heavy";
  else if (/medio|medium|miles|moderado/i.test(lower)) dataProcessing = "medium";

  // Detectar restricciones
    let budget: AppRequirements["constraints"]["budget"] = "medium";
    if (/barato|barata|low|gratis|econ[oó]mico|poco presupuesto/i.test(lower)) budget = "low";
    else if (/alto|high|empresarial|grande|mucho presupuesto/i.test(lower)) budget = "high";

  let timeline: AppRequirements["constraints"]["timeline"] = "normal";
  if (/urgente|ya|r[aá]pido|pronto|esta semana/i.test(lower)) timeline = "urgent";
  else if (/flexible|tiempo|sin prisa/i.test(lower)) timeline = "flexible";

  let team: AppRequirements["constraints"]["team"] = "small";
  if (/solo|yo|una persona/i.test(lower)) team = "solo";
  else if (/grande|equipo|empresa/i.test(lower)) team = "large";

  return {
    type,
    features,
    performance: {
      targetUsers,
      dataProcessing,
      memoryIntensive: /memoria|pesado|heavy|gr[aá]ficos/i.test(lower),
    },
    constraints: {
      budget,
      timeline,
      team,
    },
  };
}

function extractNumber(text: string, regex: RegExp): number | undefined {
  const match = text.match(regex);
  if (!match) return undefined;
  const num = parseInt(match[1], 10);
  if (/k|miles/i.test(match[0])) return num * 1000;
  if (/millones|m/i.test(match[0])) return num * 1000000;
  return num;
}
