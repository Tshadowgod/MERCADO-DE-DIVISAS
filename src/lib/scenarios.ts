import type { Scenario } from '@/types';

export const BASE_RATES = { usd: 6.91, eur: 7.52, cny: 0.95 } as const;
export const INITIAL_BOB = 100_000;
export const COUNTDOWN_DURATION = 300; // 5 minutos

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
  {
    id: 6,
    title: 'La Fed recorta tasas: inflación en EE.UU. cae al 2%',
    description:
      'La inflación en EE.UU. cae finalmente al objetivo del 2% y la Fed anuncia tres recortes de tasas para el próximo año, bajando del 5.5% al 4%. Cuando la Fed baja las tasas, los bonos del Tesoro americano pagan menos intereses. Resultado: los inversores ya no tienen incentivo para mantener dólares y buscan mejores rendimientos en Europa y Asia. En 2019, cuando la Fed también recortó tasas, el dólar se debilitó frente al euro y otras divisas en un promedio del 5% en pocos meses. El capital global empieza a fluir fuera de activos en dólares.',
    concept: 'Política Monetaria',
    icon: '✂️',
    effects: { usd: -7, eur: +4, cny: +2 },
    indicators: [
      { currency: 'usd', direction: 'down', intensity: 3 },
      { currency: 'eur', direction: 'up', intensity: 2 },
      { currency: 'cny', direction: 'up', intensity: 1 },
    ],
    question:
      '¿Si los bonos americanos ya no pagan tanto, los inversores querrán más o menos dólares? ¿Qué divisas se vuelven más atractivas cuando EE.UU. baja sus tasas?',
  },
  {
    id: 7,
    title: 'Guerra comercial: EE.UU. impone aranceles del 145% a China',
    description:
      'Washington anuncia aranceles del 145% a todas las importaciones chinas, golpeando exportaciones por valor de $500,000 millones. China responde con aranceles del 125% a productos estadounidenses. Las exportaciones chinas se derrumban en las primeras horas. Cuando China exporta menos, el mundo necesita menos yuanes para pagar esas exportaciones, reduciendo la demanda global de CNY. En la guerra comercial de 2018-2019, el yuan cayó un 10% frente al dólar en solo seis meses. Las empresas chinas presionan al gobierno para depreciar el yuan y hacer sus productos más competitivos a pesar de los aranceles.',
    concept: 'Comercio Internacional',
    icon: '⚔️',
    effects: { usd: +5, eur: +1, cny: -8 },
    indicators: [
      { currency: 'usd', direction: 'up', intensity: 2 },
      { currency: 'eur', direction: 'up', intensity: 1 },
      { currency: 'cny', direction: 'down', intensity: 3 },
    ],
    question:
      '¿Qué pasa con el yuan cuando China puede vender mucho menos al mundo? ¿Conviene tener CNY cuando sus exportaciones están bloqueadas por aranceles récord?',
  },
  {
    id: 8,
    title: 'BCE sube tasas al 4.5%: el euro se convierte en moneda refugio',
    description:
      'El Banco Central Europeo eleva su tasa de depósito al 4.5%, superando a la Fed por primera vez en 15 años. El rendimiento de los bonos alemanes a 10 años sube al 3.8%, atrayendo a fondos soberanos de Asia y Oriente Medio. Cuando Europa paga más por su deuda que EE.UU., el capital global rota hacia el euro. En 2007, la última vez que el BCE tuvo tasas más altas que la Fed, el EUR/USD llegó a 1.60: el euro más fuerte de la historia. Los gestores de reservas internacionales en más de 40 bancos centrales ya están aumentando su exposición al euro.',
    concept: 'Diferencial de Tasas',
    icon: '🇪🇺',
    effects: { usd: -3, eur: +8, cny: -1 },
    indicators: [
      { currency: 'usd', direction: 'down', intensity: 2 },
      { currency: 'eur', direction: 'up', intensity: 3 },
      { currency: 'cny', direction: 'down', intensity: 1 },
    ],
    question:
      '¿Si Europa ahora paga más intereses que EE.UU. por sus bonos, hacia qué divisa fluirá el capital global? ¿Qué conviene comprar cuando el BCE supera a la Fed?',
  },
  {
    id: 9,
    title: 'Crisis energética: Rusia corta el suministro de gas a Europa',
    description:
      'Rusia cierra el gasoducto Nord Stream 2 en represalia por nuevas sanciones europeas. Europa importa el 40% de su energía de Rusia; sin gas, la producción industrial alemana y francesa cae en picada. La cuenta de importaciones energéticas de Europa se dispara: deben pagar más dólares y yuanes por petróleo y gas de otros proveedores. En 2022, cuando ocurrió algo similar, el euro cayó a la paridad con el dólar (1:1) por primera vez en 20 años, perdiendo más del 15% de su valor. Una Europa que importa cara y exporta poco es una Europa con una divisa débil.',
    concept: 'Balanza de Pagos',
    icon: '⛽',
    effects: { usd: +4, eur: -9, cny: +2 },
    indicators: [
      { currency: 'usd', direction: 'up', intensity: 2 },
      { currency: 'eur', direction: 'down', intensity: 3 },
      { currency: 'cny', direction: 'up', intensity: 1 },
    ],
    question:
      '¿Qué pasa con una moneda cuando su región tiene que gastar mucho más en importaciones de energía? ¿Conviene tener euros cuando Europa enfrenta una crisis de suministro?',
  },
  {
    id: 10,
    title: 'FMI alerta: deuda de EE.UU. supera el 130% del PIB',
    description:
      'El FMI publica un informe urgente: la deuda pública de EE.UU. alcanza el 130% del PIB, superando a países como Italia y Grecia. Las agencias Moody\'s y Fitch rebajan la calificación de la deuda americana de AAA a AA. Los inversores temen que EE.UU. no pueda pagar sus deudas sin imprimir más dólares, lo que generaría inflación y devaluación. En 2011, cuando S&P rebajó la calificación de EE.UU. por primera vez, el dólar cayó frente al euro y al oro. Hoy los bancos centrales de China, Rusia e India aceleran la venta de sus reservas en dólares para diversificarse.',
    concept: 'Deuda Soberana',
    icon: '💸',
    effects: { usd: -8, eur: +4, cny: +3 },
    indicators: [
      { currency: 'usd', direction: 'down', intensity: 3 },
      { currency: 'eur', direction: 'up', intensity: 2 },
      { currency: 'cny', direction: 'up', intensity: 2 },
    ],
    question:
      '¿Si EE.UU. tiene más deuda que países en crisis, seguirá siendo el dólar la divisa más confiable del mundo? ¿Qué alternativas buscarán los grandes inversores?',
  },
];
