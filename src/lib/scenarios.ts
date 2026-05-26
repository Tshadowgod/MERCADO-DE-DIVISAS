import type { Scenario } from '@/types';

export const BASE_RATES = { usd: 6.91, eur: 7.52, cny: 0.95 } as const;
export const INITIAL_BOB = 100_000;
export const COUNTDOWN_DURATION = 60; // segundos

export const SCENARIOS: Scenario[] = [
  {
    id: 1,
    title: 'La Fed sube las tasas al 5.5%',
    description:
      'La Reserva Federal de EE.UU. eleva su tasa de interés de referencia del 5.25% al 5.5%, el nivel más alto en 22 años. El presidente de la Fed declaró que "la lucha contra la inflación no ha terminado". Cuando un país sube sus tasas de interés, sus bonos y activos financieros pagan más, lo que atrae capital de todo el mundo. Históricamente, en 2022 cuando la Fed hizo algo similar, el dólar subió más del 15% frente a todas las monedas del mundo en solo unos meses, debilitando fuertemente al euro y al yuan.',
    concept: 'Política Monetaria',
    icon: '🏦',
    effects: { usd: +8, eur: -2, cny: -2 },
    indicators: [
      { currency: 'usd', direction: 'up', intensity: 3 },
      { currency: 'eur', direction: 'down', intensity: 1 },
      { currency: 'cny', direction: 'down', intensity: 1 },
    ],
    question:
      '¿Si los inversores del mundo pueden obtener mejor retorno en EE.UU., hacia qué divisa moverán su dinero? ¿Qué conviene comprar antes de que el mercado reaccione?',
  },
  {
    id: 2,
    title: 'Crisis política en la Eurozona',
    description:
      'El gobierno de coalición en Francia cae por una moción de censura. Simultáneamente, Italia anuncia que revisará sus compromisos de deuda con la Unión Europea. Los mercados reaccionan con nerviosismo extremo: el índice de volatilidad del euro (EVZ) sube al nivel más alto desde 2020. En la crisis griega de 2011, una situación similar llevó al euro a caer más del 20% en pocos meses. Los grandes fondos de inversión ya están buscando activos "refugio" más seguros fuera de Europa. La salida masiva de capitales del euro ya comenzó.',
    concept: 'Riesgo Político',
    icon: '⚠️',
    effects: { usd: +3, eur: -7, cny: +1 },
    indicators: [
      { currency: 'usd', direction: 'up', intensity: 2 },
      { currency: 'eur', direction: 'down', intensity: 3 },
      { currency: 'cny', direction: 'up', intensity: 1 },
    ],
    question:
      '¿Dónde mueven su dinero los inversores cuando hay incertidumbre política en Europa? ¿Es seguro mantener euros en este momento o conviene venderlos?',
  },
  {
    id: 3,
    title: 'China: superávit comercial récord de $85 mil millones',
    description:
      'China reporta un superávit comercial histórico de $85,000 millones en un solo mes, impulsado por exportaciones masivas de manufactura, semiconductores y vehículos eléctricos BYD. Para comprar productos chinos, los países del mundo DEBEN convertir primero su dinero a yuanes. Más exportaciones significa más demanda global de CNY. China lleva décadas con superávit comercial consecutivo: así construyó la segunda economía más grande del mundo y acumuló las mayores reservas internacionales de la historia. Hoy la demanda de yuan sube abruptamente en los mercados de divisas.',
    concept: 'Balanza Comercial',
    icon: '📦',
    effects: { usd: -2, eur: -1, cny: +7 },
    indicators: [
      { currency: 'usd', direction: 'down', intensity: 1 },
      { currency: 'eur', direction: 'down', intensity: 1 },
      { currency: 'cny', direction: 'up', intensity: 3 },
    ],
    question:
      '¿Si todos los países del mundo necesitan comprar yuanes para pagar a China, qué pasa con el valor del CNY? ¿Qué divisa deberías tener ahora mismo?',
  },
  {
    id: 4,
    title: 'Bolivia agota sus reservas: el BCB confirma solo $1,700 millones',
    description:
      'El Banco Central de Bolivia confirma que las reservas internacionales cayeron a solo $1,700 millones, desde los $15,000 millones que tenía en 2014. Sin reservas suficientes, el BCB ya no puede sostener el tipo de cambio oficial de Bs 6.91 por dólar. En el mercado paralelo boliviano, el dólar ya se cotiza por encima de Bs 9. Este mismo patrón ocurrió en Argentina en 2001 (corralito) y Venezuela en 2016: cuando un banco central pierde reservas, todas las divisas extranjeras se disparan frente a la moneda local porque la demanda de divisas supera la oferta disponible.',
    concept: 'Reservas Internacionales',
    icon: '📉',
    effects: { usd: +6, eur: +6, cny: +6 },
    indicators: [
      { currency: 'usd', direction: 'up', intensity: 3 },
      { currency: 'eur', direction: 'up', intensity: 3 },
      { currency: 'cny', direction: 'up', intensity: 3 },
    ],
    question:
      '¿Si Bolivia no puede garantizar el valor del boliviano, qué pasa con el valor de TODAS las divisas extranjeras? ¿Tiene sentido quedarse con bolivianos?',
  },
  {
    id: 5,
    title: 'BRICS: 50 países adoptan el yuan como moneda de reserva',
    description:
      'En la cumbre histórica del BRICS en Kazán, Rusia, 50 países firman el "Acuerdo de Kazán": usarán el yuan chino en lugar del dólar para todo el comercio bilateral de petróleo, gas y materias primas. Arabia Saudita anuncia formalmente que aceptará yuanes por su petróleo. El índice del dólar (DXY), que mide la fortaleza global del USD, cae 2% en minutos. Durante 80 años el dólar fue la única moneda de reserva mundial; hoy ese monopolio se rompe. La demanda global de yuan se multiplica mientras la necesidad de dólares cae en todas las transacciones internacionales.',
    concept: 'Política Cambiaria Internacional',
    icon: '🤝',
    effects: { usd: -5, eur: -2, cny: +9 },
    indicators: [
      { currency: 'usd', direction: 'down', intensity: 3 },
      { currency: 'eur', direction: 'down', intensity: 1 },
      { currency: 'cny', direction: 'up', intensity: 3 },
    ],
    question:
      '¿Si el mundo ya no necesita tanto dólares pero sí cada vez más yuanes, qué pasa con ambas divisas? ¿Qué deberías vender y qué deberías comprar?',
  },
];
