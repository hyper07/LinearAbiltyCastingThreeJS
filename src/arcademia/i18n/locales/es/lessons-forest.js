/** Español — the Great Tree's lessons (overlay on content/forest.js; text only). */
export default {
  // ───────── Escuela Vaina de los Patrones (Lógica y patrones, Nuez) ─────────
  // ── Anillo 1: Hueco de las Raíces ──
  'logic1-forest-secret-rule': {
    title: 'La regla secreta de Nuez', topicName: 'Ordenar por color, forma y tipo', blurb: 'Nuez repartió en cestas lo que encontró en el bosque. ¿Adivinas su regla?',
    reading: [
      { title: 'Igual y diferente', text: 'Las cosas pueden ser iguales en algo y diferentes en otra cosa. Una mariquita roja y un hongo rojo son del mismo color, pero una es un insecto y el otro es un hongo.' },
      { title: 'Ordenar es agrupar', text: 'Cuando ordenamos, juntamos en un grupo las cosas que se parecen en algo. Cada otoño, Nuez reparte en cestas todo lo que encuentra.' },
      { title: 'Una regla para ordenar', text: 'Una regla para ordenar dice cómo se agruparon las cosas: por color, por forma, por tamaño o por lo que son. ¡Mira bien los grupos y podrás adivinar la regla!' }
    ],
    sort: {
      q: 'Nuez repartió en cestas algunas cosas del bosque. ¿Adivinas su regla secreta?',
      groups: [{ label: 'Cosas rojas' }, { label: 'Cosas amarillas' }, { label: 'Cosas verdes' }],
      items: [
        { label: 'Hongo venenoso' }, { label: 'Girasol' }, { label: 'Rana' }, { label: 'Mariquita' }, { label: 'Fresa silvestre' },
        { label: 'Hoja roja de arce', hint: 'En otoño, las hojas del arce se ponen de un rojo brillante.' },
        { label: 'Pollito amarillo' }, { label: 'Botón de oro' }, { label: 'Limón' },
        { label: 'Oruga', hint: 'Fíjate en su color, no en lo que es.' },
        { label: 'Helecho' }, { label: 'Pera' }
      ],
      rule: { q: '¿Cómo ordenó Nuez sus cosas?', choices: ['Por tamaño', 'Por color', 'Animales y plantas'], hint: 'Mira el hongo, el girasol y la rana. ¿En qué son diferentes?', explain: 'El hongo es rojo, el girasol es amarillo y la rana es verde: Nuez ordenó por color.' }
    },
    quiz: [
      { q: 'Nuez ordena por forma. ¿Dónde va una piedrita redonda?', choices: ['Con las cosas largas', 'Con las cosas redondas', 'Con las cosas rojas'], hint: 'La regla trata de la forma.', explain: 'Si ordenamos por forma, la piedrita redonda va con las otras cosas redondas.' },
      { q: 'Una mariquita roja y una baya roja se parecen en una cosa. ¿En cuál?', choices: ['Son del mismo color', 'Las dos son animales', 'Las dos pueden volar'], hint: 'Mira bien, no pienses en lo que son.', explain: 'Las dos son rojas. La mariquita es un animal y la baya no, pero el color es el mismo.' },
      { q: 'Pip puso 🐦 🦋 🐝 en un grupo y 🐌 🐛 🐜 en otro. ¿Cuál es la regla?', choices: ['Grandes y pequeños', 'Rojos y azules', 'Pueden volar y no pueden volar'], hint: '¿Qué pueden hacer el pájaro, la mariposa y la abeja?', explain: 'El pájaro, la mariposa y la abeja pueden volar. El caracol, la oruga y la hormiga no.' },
      { q: '¿De cuántas maneras puedes ordenar las mismas cosas?', choices: ['De una sola manera', 'De muchas maneras'], hint: 'Piensa en el color, el tamaño, la forma…', explain: 'Puedes ordenar las mismas cosas de muchas maneras: por color, por tamaño, por forma, por dónde viven…' },
      { q: 'Nuez tiene 🍎 🍓 🍄 🐞. ¿Qué regla junta a los cuatro?', choices: ['Todos son animales', 'Todos son frutas', 'Todos son rojos'], hint: 'El hongo no es una fruta y la manzana no es un animal.', explain: '¡Todos son rojos! Solo una regla de color sirve para los cuatro.' }
    ]
  },
  'logic1-forest-leaf-patterns': {
    title: 'Patrones de hojas: ¿qué viene después?', topicName: 'Patrones que se repiten', blurb: 'Encuentra la parte que se repite y sabrás qué viene después.',
    reading: [
      { title: 'Un patrón se repite', text: 'En un patrón que se repite, la misma parte vuelve una y otra vez: bellota, hoja, bellota, hoja, bellota, hoja…' },
      { title: 'Busca la parte que se repite', text: 'En 🍂🍂🌰🍂🍂🌰 la parte que se repite es 🍂🍂🌰. Encuentra esa parte y podrás decir qué viene después.' },
      { title: 'Patrones por todas partes', text: 'El bosque está lleno de patrones: las rayas de una abeja y el canto del cuco, cu-cú, cu-cú, cu-cú.' }
    ],
    sort: {
      q: 'Algunas filas de Nuez son patrones y otras están revueltas. ¡Ordénalas!',
      groups: [{ label: 'Patrón que se repite' }, { label: 'Revuelto: sin patrón' }],
      items: [
        { label: '🍂🌰🍂🌰🍂🌰' }, { label: '🍄🍄🌿🍄🍄🌿' }, { label: '🐞🐌🐜🐞🐌🐜' }, { label: '🌲🌳🌲🌳🌲🌳' },
        { label: '⭐🌙⭐⭐🌙⭐', hint: 'Mira de tres en tres: ⭐🌙⭐, ¡y otra vez ⭐🌙⭐!' },
        { label: '🌸🌼🌸🌸🌼🌼', hint: '🌸🌼 y luego 🌸🌸: la parte no vuelve igual.' },
        { label: '🐿️🐿️🦔🐿️🦔🦔' }, { label: '🐦🐛🐛🐦🐦🐛' }
      ]
    },
    quiz: [
      { q: '¿Qué viene después? 🍂🌰🍂🌰🍂 …', choices: ['🍂', '🌰', '🍄'], hint: 'Hoja, bellota, hoja, bellota…', explain: 'La parte 🍂🌰 se repite, así que después de 🍂 viene 🌰.' },
      { q: '¿Qué viene después? 🐞🐞🐜🐞🐞🐜🐞 …', choices: ['🐜', '🐌', '🐞'], hint: 'La parte que se repite es 🐞🐞🐜.', explain: '🐞🐞🐜, 🐞🐞🐜, y luego 🐞🐞… así que el siguiente es 🐞.' },
      { q: '¿Qué parte se repite en 🌸🌿🌿🌸🌿🌿?', choices: ['🌸🌿', '🌸🌿🌿', '🌿🌿'], hint: '¿Dónde vuelve a salir 🌸?', explain: '🌸🌿🌿 sale una vez y luego otra: esa es la parte que se repite.' },
      { q: '¿Qué fila es un patrón que se repite?', choices: ['🦔🦔🐿️🦔🐿️🐿️', '🐿️🦔🦔🐿️🐿️🦔', '🦔🐿️🦔🐿️🦔🐿️'], hint: 'Busca la misma parte que vuelve.', explain: '🦔🐿️ vuelve una y otra vez: erizo, ardilla, erizo, ardilla.' },
      { q: 'Un pájaro canta: pío, pío, chip, pío, pío, chip, pío, pío… ¿Qué viene después?', choices: ['Chip', 'Pío', 'Uuh'], hint: 'Dos píos y luego…', explain: 'El canto hace pío, pío, chip, una y otra vez. Después de dos píos viene chip.' }
    ]
  },

  // ── Anillo 2: Ramas de Helecho ──
  'logic2-forest-bird-count': {
    title: 'Día de contar pájaros: marcas de conteo y pictogramas', topicName: 'Tablas de conteo y pictogramas', blurb: 'Cuenta los pájaros que vienen de visita y luego haz un gráfico con dibujos.',
    reading: [
      { title: 'Marcas de conteo', text: 'Para contar los pájaros que pasan volando, haz una rayita por cada pájaro. La quinta raya cruza las otras cuatro, como una puertecita. Así puedes contar las puertas de cinco en cinco.' },
      { title: 'Un pictograma', text: 'Un pictograma muestra números con dibujos. Cada fila es un tipo de pájaro, con un dibujo por cada pájaro que se vio. La fila más larga es el pájaro que más se vio.' },
      { title: 'Pregúntale al gráfico', text: 'Un gráfico nos ayuda a responder preguntas: ¿qué pájaro vino más? ¿Cuál vino menos? ¿Cuántos petirrojos más que búhos? Lo vemos sin tener que volver a contar.' }
    ],
    sort: {
      q: 'Los niños de las Ramas de Helecho vieron estos pájaros. ¡Pon cada uno en su fila para hacer un pictograma!',
      groups: [{ label: 'Petirrojos' }, { label: 'Búhos' }, { label: 'Patos' }],
      items: [
        { label: 'Petirrojo en la puerta' }, { label: 'Petirrojo en el acebo' }, { label: 'Petirrojo junto al bebedero' }, { label: 'Petirrojo en una pala' }, { label: 'Petirrojo en el seto' },
        { label: 'Búho en el roble' }, { label: 'Búho en el tejado del granero' },
        { label: 'Pato en el estanque' }, { label: 'Pato entre los juncos' }, { label: 'Pato junto al arroyo' }
      ]
    },
    quiz: [
      { q: 'En tu pictograma, ¿qué pájaro se vio más?', choices: ['Los búhos', 'Los patos', 'Los petirrojos'], hint: '¿Qué fila es la más larga?', explain: 'La fila de los petirrojos es la más larga: 5 petirrojos.' },
      { q: 'Se vieron 5 petirrojos y 2 búhos. ¿Cuántos petirrojos más que búhos?', choices: ['3', '7', '2'], hint: 'Pon las filas una al lado de la otra. ¿Cuántos petirrojos no tienen un búho al lado?', explain: '5 − 2 = 3. Hay tres petirrojos más que búhos.' },
      { q: 'Un conteo muestra una puerta de cinco y dos rayas más. ¿Cuántos pájaros son?', choices: ['2', '7', '5'], hint: 'Una puerta vale 5. Luego sigue contando.', explain: '5, y luego 6, 7. El conteo muestra 7 pájaros.' },
      { q: 'En un pictograma, ¿qué te dice la fila más larga?', choices: ['De qué hay más', 'Qué es lo más grande', 'Qué es lo más viejo'], hint: 'Un dibujo por cada uno que se contó.', explain: 'Más dibujos quiere decir que se contaron más, así que la fila más larga es de lo que hay más.' },
      { q: '¿Por qué se hacen las marcas de conteo en puertas de cinco?', choices: ['Porque los pájaros vienen de cinco en cinco', 'Para contarlas rápido de cinco en cinco', 'Para que queden bonitas'], hint: '5, 10, 15, 20…', explain: 'Las puertas de cinco se cuentan rápido: 5, 10, 15, 20, y luego las rayas que sobran.' }
    ]
  },
  'logic2-forest-odd-one-out': {
    title: 'El intruso', topicName: 'Encontrar el intruso', blurb: 'Todos menos uno tienen algo en común. ¡Encuentra al intruso y di por qué!',
    reading: [
      { title: '¿Cuál no encaja?', text: 'En un acertijo del intruso, todas las cosas menos una tienen algo en común. Descubre qué comparten, ¡y el intruso salta a la vista!' },
      { title: 'Mira de distintas maneras', text: 'Fíjate en el color, la forma y el tamaño, en qué es cada cosa, dónde vive y cómo se mueve. 🦆🐟🐸🐄: tres viven en el agua o cerca de ella. La vaca no.' },
      { title: 'Di por qué', text: 'A veces puede haber más de una respuesta correcta, si sabes explicar tu razón. Los buenos resolvedores de acertijos siempre dicen por qué.' }
    ],
    dig: {
      q: '¡Aparta las hojas caídas para encontrar las piedras-acertijo de Nuez!',
      finds: [
        { label: 'Una piedra-acertijo', text: 'Nuez pintó un acertijo en esta piedra.', question: { q: 'El intruso: 🍎 🍐 🍌 🥕', choices: ['🍌 el plátano', '🥕 la zanahoria', '🍐 la pera'], hint: 'Tres de ellos son frutas.', explain: 'La manzana, la pera y el plátano son frutas. ¡La zanahoria es una raíz!' } },
        { label: 'Una nota bajo un capuchón de bellota', text: 'Hay una notita escondida bajo el capuchón de una bellota.', question: { q: 'El intruso: 🐟 🐬 🐙 🐿️', choices: ['🐿️ la ardilla', '🐙 el pulpo', '🐬 el delfín'], hint: '¿Dónde viven?', explain: 'El pez, el delfín y el pulpo viven en el mar. La ardilla vive en los árboles.' } },
        { label: 'Una tarjeta de hoja', text: 'En esta hoja hay números rayados.', question: { q: 'El intruso: 2, 4, 6, 7, 8', choices: ['2', '8', '7'], hint: '¿Qué número no se puede repartir en dos montones iguales?', explain: '2, 4, 6 y 8 son pares. El 7 es el único impar, ¡así que es el intruso!' } },
        { label: 'Una concha con formas', text: 'Dentro de esta concha hay formas pintadas de colores.', question: { q: 'El intruso: 🔴 🟢 🔵 🟥', choices: ['🔴 el círculo rojo', '🟥 el cuadrado rojo', '🔵 el círculo azul'], hint: 'Fíjate en la forma, no en el color.', explain: 'Tres son círculos. El cuadrado rojo es el intruso, ¡aunque uno de los círculos también sea rojo!' } }
      ]
    },
    quiz: [
      { q: 'El intruso: 🌲 🌳 🌴 🍄', choices: ['🌲', '🍄', '🌴'], hint: 'Tres de ellos son árboles.', explain: 'El pino, el roble y la palmera son árboles. El hongo no es una planta: es un hongo.' },
      { q: 'El intruso: 🐝 🦋 🐞 🕷️. ¿Por qué la araña es el intruso?', choices: ['Es la única roja', 'Es la más pequeña', 'Tiene ocho patas, no seis'], hint: 'Cuenta sus patas.', explain: 'Las abejas, las mariposas y las mariquitas son insectos con seis patas. La araña tiene ocho patas.' },
      { q: 'El intruso: nieve ❄️, lluvia 🌧️, sol ☀️, granizo 🧊', choices: ['El sol', 'El granizo', 'La nieve'], hint: 'Tres de ellos caen de las nubes.', explain: 'La nieve, la lluvia y el granizo son agua que cae de las nubes. El sol es la luz del Sol.' },
      { q: 'El intruso: 🐶 🐱 🐰 🐔. ¿Qué razón sirve para la gallina?', choices: ['Es la más grande', 'Tiene plumas y los demás tienen pelo', 'No puede caminar'], hint: 'Mira cómo van cubiertos.', explain: 'El perro, el gato y el conejo tienen pelo. La gallina tiene plumas.' },
      { q: '¿Puede un acertijo del intruso tener más de una buena respuesta?', choices: ['No, nunca', 'Sí, si sabes explicar por qué'], hint: '¿Qué hacen siempre los buenos resolvedores de acertijos?', explain: 'Si das una buena razón, puede haber más de una respuesta correcta.' }
    ]
  },

  // ── Anillo 3: Ramas de Farolillos ──
  'logic3-forest-venn': {
    title: 'Diagramas de Venn: donde los círculos se cruzan', topicName: 'Diagramas de Venn', blurb: 'Dos círculos, una parte del medio y un afuera: ordena los animales en un diagrama de Venn.',
    reading: [
      { title: 'Dos círculos', text: 'Un diagrama de Venn son dos círculos que se superponen. Cada círculo guarda las cosas que tienen una característica, como «tiene pelo» o «vive en el agua».' },
      { title: 'La parte del medio', text: 'Donde los círculos se superponen van las cosas que tienen las dos características. La nutria tiene pelo y vive en los ríos, ¡así que va en el medio!' },
      { title: 'Fuera de los círculos', text: 'Las cosas que no tienen ninguna de las dos características van fuera de los dos círculos. El búho no tiene pelo y no vive en el agua.' },
      { title: 'Por John Venn', text: 'Estos diagramas llevan el nombre de John Venn, un profesor inglés de lógica, que escribió sobre ellos en 1880.' }
    ],
    sort: {
      q: 'Círculos: «Tiene pelo» y «Vive en el agua». ¿Dónde va cada animal?',
      groups: [{ label: 'Solo pelo' }, { label: 'Solo agua' }, { label: 'Los dos: el medio' }, { label: 'Ninguno: afuera' }],
      items: [
        { label: 'Zorro' }, { label: 'Conejo' }, { label: 'Ardilla' }, { label: 'Pez' }, { label: 'Pulpo' }, { label: 'Cangrejo' }, { label: 'Nutria' },
        { label: 'Castor', hint: 'Los castores tienen un pelo grueso que no deja pasar el agua, y viven en estanques y ríos.' },
        { label: 'Foca', hint: 'Las focas tienen pelo corto y pasan mucho tiempo en el mar.' },
        { label: 'Búho', hint: 'Los búhos tienen plumas, no pelo, y viven en los árboles.' },
        { label: 'Caracol' }, { label: 'Mariquita' }
      ]
    },
    quiz: [
      { q: 'Círculos: «Rojo» y «Redondo». ¿Dónde va una manzana roja?', choices: ['Fuera de los dos círculos', 'Solo en «Redondo»', 'En el medio, en los dos círculos'], hint: '¿Es roja? ¿Es redonda?', explain: 'Una manzana roja es roja y redonda, así que va en el medio, donde los círculos se superponen.' },
      { q: 'Los mismos círculos. ¿Dónde va un plátano amarillo?', choices: ['Fuera de los dos círculos', 'En el medio', 'Solo en «Rojo»'], hint: '¿Es rojo? ¿Es redondo?', explain: 'Un plátano no es ni rojo ni redondo, así que va fuera de los dos círculos.' },
      { q: '¿Qué va en la parte donde los círculos se superponen?', choices: ['Las cosas sin ninguna de las dos características', 'Las cosas con las dos características', 'Solo las cosas más grandes'], hint: 'Está dentro de los dos círculos a la vez.', explain: 'La parte común está dentro de los dos círculos, así que guarda las cosas con las dos características.' },
      { q: '¿De quién llevan el nombre los diagramas de Venn?', choices: ['De John Venn, un profesor de lógica', 'De un pueblo llamado Venn', 'De una ardilla llamada Venn'], hint: 'Escribió sobre ellos en 1880.', explain: 'John Venn, un profesor inglés de lógica, escribió sobre estos diagramas en 1880.' },
      { q: 'Círculos: «Tiene pelo» y «Vive en el agua». ¿Dónde va un pez de colores?', choices: ['Solo pelo', 'Solo agua', 'Los dos'], hint: '¿Tiene pelo un pez de colores?', explain: 'Un pez de colores vive en el agua pero no tiene pelo, así que va en «Solo agua».' }
    ]
  },
  'logic3-forest-chance-words': {
    title: 'Seguro, probable, poco probable, imposible', topicName: 'Palabras de probabilidad', blurb: '¿Pasará? Usa palabras de probabilidad para decir qué tan probable es.',
    reading: [
      { title: '¿Pasará?', text: 'Algunas cosas pasarán seguro, como que la noche llegue después del día. Otras no pueden pasar nunca, como que una ardilla se convierta en una tetera. La mayoría están en algún punto intermedio.' },
      { title: 'Probable y poco probable', text: 'Probable quiere decir que seguramente pasará, como que llueva en una selva tropical. Poco probable quiere decir que seguramente no pasará, pero podría, como encontrar un trébol de cuatro hojas.' },
      { title: 'Las mismas posibilidades', text: 'Algunas cosas tienen las mismas posibilidades de pasar que de no pasar, como que una moneda caiga en cara. Si la lanzas muchas veces, más o menos la mitad saldrá cara.' }
    ],
    sort: {
      q: '¿Qué tan probable es? ¡Ordena las predicciones de Nuez sobre el bosque!',
      groups: [{ label: 'Seguro' }, { label: 'Probable' }, { label: 'Poco probable' }, { label: 'Imposible' }],
      items: [
        { label: 'Una bellota que se suelta cae hacia abajo' }, { label: 'La semana que viene tiene siete días' }, { label: 'Llueve algún día de este mes' }, { label: 'Ves una ardilla en un parque grande' },
        { label: 'Encuentras un trébol de cuatro hojas', hint: 'Casi todos los tréboles tienen tres hojas. Uno de cuatro es raro, ¡pero hay gente que los encuentra!' },
        { label: 'Un pájaro se posa en tu cabeza' }, { label: 'A una rana le salen plumas' },
        { label: 'De una bellota crece un pino', hint: '¿Qué árbol crece de una bellota?' }
      ]
    },
    quiz: [
      { q: '¿Qué palabra corresponde a «Un gato pondrá un huevo»?', choices: ['Probable', 'Imposible', 'Seguro'], hint: '¿Los gatos ponen huevos?', explain: 'Los gatos nunca ponen huevos, así que es imposible.' },
      { q: 'Lanzas una moneda. ¿Qué posibilidad hay de que salga cara?', choices: ['Seguro', 'Imposible', 'Las mismas posibilidades que cruz'], hint: 'Tiene dos lados.', explain: 'Cara y cruz son igual de probables, así que hay las mismas posibilidades.' },
      { q: 'En una bolsa hay 9 bellotas marrones y 1 verde. Sacas una sin mirar. Que salga marrón es…', choices: ['Probable', 'Poco probable', 'Imposible'], hint: 'Casi todas son marrones.', explain: '9 de las 10 bellotas son marrones, así que es probable que salga marrón.' },
      { q: 'La misma bolsa. Que salga una bellota roja es…', choices: ['Poco probable', 'Probable', 'Imposible'], hint: '¿Hay alguna bellota roja en la bolsa?', explain: 'En la bolsa no hay bellotas rojas, así que es imposible.' },
      { q: '¿Qué es poco probable, pero podría pasar?', choices: ['Que mañana llegue después de hoy', 'Encontrar un trébol de cuatro hojas', 'Que un pez ande en bicicleta'], hint: 'Una cosa es segura y otra es imposible.', explain: 'Los tréboles de cuatro hojas son raros, pero la gente los encuentra: es poco probable, no imposible.' }
    ]
  },

  // ── Anillo 4: Copa en Flor ──
  'logic4-forest-growing-patterns': {
    title: 'Patrones que crecen', topicName: 'Patrones que crecen y secuencias', blurb: 'Patrones que crecen, se duplican o se encogen: encuentra la regla de cada uno.',
    reading: [
      { title: 'Patrones que crecen', text: 'Un patrón que crece cambia en cada paso siguiendo una regla. Un arbolito tiene 1 hoja, luego 3, luego 5, luego 7: le salen 2 hojas cada semana.' },
      { title: 'Encuentra la regla', text: 'Mira cuánto cambia de un paso al siguiente. 4, 7, 10, 13: en cada paso se suma 3. Así que el siguiente es 16.' },
      { title: 'El doble', text: 'Algunos patrones se duplican: 1, 2, 4, 8, 16. Un patrón que se duplica crece cada vez más rápido, como una célula diminuta que se divide en 2, luego en 4, luego en 8.' },
      { title: 'También se encogen', text: 'Los patrones también pueden encogerse: 20, 17, 14, 11. Aquí la regla es «quitar 3» en cada paso.' }
    ],
    sort: {
      q: '¿Cuál es la regla de cada serie de números? ¡Ordénalas!',
      groups: [{ label: '+2 en cada paso' }, { label: '+3 en cada paso' }, { label: 'El doble en cada paso' }, { label: '−3 en cada paso' }],
      items: [
        { label: '1, 3, 5, 7' }, { label: '10, 12, 14, 16' }, { label: '2, 5, 8, 11' }, { label: '4, 7, 10, 13' },
        { label: '2, 4, 8, 16', hint: 'De 2 a 4 es +2, pero de 4 a 8 es +4. ¿Qué pasa cada vez?' },
        { label: '3, 6, 12, 24', hint: 'De 3 a 6 es +3, pero de 6 a 12 es +6. Cada número es el doble del anterior.' },
        { label: '5, 10, 20, 40' }, { label: '20, 17, 14, 11' }, { label: '30, 27, 24, 21' }
      ]
    },
    dig: {
      q: '¡Escarba entre las hojas para encontrar las piedras de patrones de Nuez!',
      finds: [
        { label: 'Una piedra de patrones', text: 'Tiene rayado: 🌱 2 hojas, luego 4, luego 6…', question: { q: 'Si el brote sigue creciendo igual, ¿cuántas hojas tendrá después?', choices: ['7', '12', '8'], hint: '¿Cuántas hojas gana cada vez?', explain: 'Gana 2 hojas cada vez: 2, 4, 6, 8.' } },
        { label: 'Una pila de troncos', text: 'Las ardillas apilan troncos: 1 arriba, 2 debajo, 3 debajo de esos…', question: { q: '¿Cuántos troncos hay en la fila de abajo siguiente?', choices: ['4', '6', '5'], hint: 'Cada fila tiene un tronco más.', explain: '1, 2, 3 y luego 4. Cada fila hacia abajo tiene un tronco más.' } },
        { label: 'Un corro de hongos', text: 'Un corro de hongos: 3, luego 6, luego 12…', question: { q: 'Si sigue duplicándose, ¿cuántos hongos vienen después?', choices: ['15', '24', '18'], hint: 'El doble de 12.', explain: '3, 6, 12, 24: cada número es el doble del anterior.' } }
      ]
    },
    quiz: [
      { q: '¿Qué viene después? 5, 9, 13, 17, …', choices: ['20', '18', '21'], hint: '¿Cuánto sube en cada paso?', explain: 'Sube 4 en cada paso: 17 + 4 = 21.' },
      { q: '¿Cuál es la regla? 2, 4, 8, 16, 32', choices: ['Sumar 2 cada vez', 'El doble cada vez', 'Sumar 4 cada vez'], hint: 'Mira los saltos: se hacen más grandes.', explain: 'Cada número es el doble del anterior: 2, 4, 8, 16, 32.' },
      { q: 'Una rana salta 3 nenúfares, luego 6, luego 9. Si el patrón crece igual, ¿cuánto saltará después?', choices: ['12', '10', '18'], hint: '¿Cuántos más cada vez?', explain: 'Suma 3 cada vez: 3, 6, 9, 12.' },
      { q: '¿Qué patrón se encoge?', choices: ['5, 10, 15, 20', '40, 35, 30, 25', '1, 2, 4, 8'], hint: '¿Qué números se hacen más pequeños?', explain: '40, 35, 30, 25 quita 5 en cada paso: se encoge.' },
      { q: 'El paso 1 tiene 1 hoja, el paso 2 tiene 4 y el paso 3 tiene 7. ¿Cuántas hojas hay en el paso 5?', choices: ['10', '13', '15'], hint: 'Encuentra la regla y sigue hasta el paso 5.', explain: 'Suma 3 en cada paso: 1, 4, 7, 10, 13. El paso 5 tiene 13 hojas.' }
    ]
  },
  'logic4-forest-bar-charts': {
    title: 'Gráficos de barras: el censo del Gran Árbol', topicName: 'Leer gráficos de barras', blurb: 'Los guardabosques contaron los árboles. ¿Qué nos dice su gráfico de barras?',
    reading: [
      { title: 'Barras para los números', text: 'Un gráfico de barras muestra los números como barras. Cuanto más alta es la barra, mayor es el número. Cada barra tiene una etiqueta que dice qué muestra.' },
      { title: 'Lee la escala', text: 'La escala del costado te dice cuánto vale cada línea. En algunos gráficos cada línea vale 1; en otros, 2, 5 o 10. ¡Lee siempre la escala primero!' },
      { title: 'Entre las líneas', text: 'Si una barra se detiene justo a mitad de camino entre 10 y 20, en una escala que cuenta de diez en diez, muestra 15.' },
      { title: 'Pregúntale al gráfico', text: 'Con un gráfico de barras es rápido comparar: qué hay más, qué hay menos y cuántos más hay de uno que de otro.' }
    ],
    sort: {
      q: 'Las barras del censo: Roble 12 · Abedul 6 · Pino 15 · Arce 9. ¿Verdadero o falso?',
      groups: [{ label: 'Verdadero' }, { label: 'Falso' }],
      items: [
        { label: 'El pino tiene la barra más alta' },
        { label: 'Hay el doble de robles que de abedules', hint: 'El doble de 6, ¿es 12?' },
        { label: 'Hay 3 pinos más que robles' }, { label: 'La barra del arce es más baja que la del roble' }, { label: 'El abedul tiene la barra más alta' }, { label: 'Hay 20 pinos' },
        { label: 'El arce y el abedul tienen la misma altura', hint: 'El arce es 9 y el abedul es 6.' },
        { label: 'La barra del roble es la más baja' }
      ]
    },
    quiz: [
      { q: 'La escala de un gráfico cuenta de cinco en cinco. Una barra se detiene en la 4.ª línea. ¿Qué número muestra?', choices: ['4', '9', '20'], hint: 'Cuenta 5, 10, 15…', explain: '5, 10, 15, 20: la 4.ª línea es 20.' },
      { q: 'En una escala que cuenta de diez en diez, una barra se detiene a mitad de camino entre 10 y 20. ¿Qué muestra?', choices: ['15', '12', '20'], hint: '¿Qué número está a mitad de camino entre 10 y 20?', explain: 'A mitad de camino entre 10 y 20 está el 15.' },
      { q: 'La barra de los pájaros muestra 8 y la de los murciélagos muestra 3. ¿Cuántos pájaros más que murciélagos?', choices: ['11', '5', '3'], hint: 'Compara las dos barras.', explain: '8 − 3 = 5. Había 5 pájaros más que murciélagos.' },
      { q: '¿Qué debes leer primero en un gráfico de barras?', choices: ['El color de las barras', 'La última barra', 'La escala y las etiquetas'], hint: '¿Qué te dice lo que significan las barras?', explain: 'La escala dice cuánto vale cada línea, y las etiquetas dicen qué muestra cada barra.' },
      { q: '¿Para qué sirve mejor un gráfico de barras?', choices: ['Para comparar cantidades', 'Para contar un cuento', 'Para deletrear una palabra'], hint: 'Barras altas, barras bajas…', explain: 'Los gráficos de barras nos dejan comparar cantidades de un vistazo.' }
    ]
  },

  // ── Anillo 5: Altos del Nido ──
  'logic5-forest-if-then': {
    title: 'Si…, entonces…: piensa como un detective', topicName: 'Razonar con «si…, entonces…»', blurb: '¿Qué tiene que ser verdad, qué no puede serlo y qué no podemos saber?',
    reading: [
      { title: 'Una regla «si…, entonces…»', text: 'Una regla «si…, entonces…» une dos cosas: SI llueve, ENTONCES salen los caracoles. Siempre que pasa la parte del «si», también pasa la parte del «entonces».' },
      { title: '¡No le des la vuelta!', text: 'La regla no funciona al revés. Si ves caracoles, no tuvo por qué llover: los caracoles también salen en las noches húmedas. «Si A, entonces B» no quiere decir «si B, entonces A».' },
      { title: 'El truco del detective', text: 'Pero si la regla es verdad y no hay caracoles, puedes estar seguro de que no llovió: si hubiera llovido, los caracoles habrían salido.' },
      { title: 'Tiene que, no puede o no se sabe', text: 'Con una regla, una frase puede «tener que ser verdad», «no poder ser verdad» o «no se sabe». Quien piensa con cuidado distingue cuál es cuál.' }
    ],
    sort: {
      q: 'Regla: SI llueve, ENTONCES Nuez lleva su paraguas de hoja. ¡Ordena cada frase!',
      groups: [{ label: 'Tiene que ser verdad' }, { label: 'No puede ser verdad' }, { label: 'No se sabe' }],
      items: [
        { label: 'Llueve, así que Nuez lleva su paraguas' },
        { label: 'Nuez no lleva paraguas, así que no llueve', hint: 'Si lloviera, llevaría su paraguas.' },
        { label: 'Llueve y Nuez no lleva paraguas', hint: 'Eso rompe la regla.' },
        { label: 'Nuez lleva su paraguas, así que llueve', hint: 'Puede que también lo lleve un día seco. La regla no dice que no pueda.' },
        { label: 'Hace sol, así que Nuez no lleva paraguas', hint: 'La regla solo nos habla de los días de lluvia.' },
        { label: 'Llueve, así que Nuez lleva sombrero', hint: '¡La regla habla de su paraguas, no de sombreros!' }
      ]
    },
    quiz: [
      { q: 'Regla: si un animal es un ave, entonces tiene plumas. El petirrojo es un ave. Entonces…', choices: ['No se sabe', 'El petirrojo tiene plumas', 'El petirrojo sabe nadar'], hint: 'La parte del «si» es verdad para el petirrojo.', explain: 'El petirrojo es un ave, así que, según la regla, tiene plumas.' },
      { q: 'La misma regla. El murciélago no tiene plumas. Entonces…', choices: ['El murciélago no es un ave', 'El murciélago es un ave', 'El murciélago es un pez'], hint: 'Usa el truco del detective.', explain: 'Todas las aves tienen plumas. El murciélago no tiene, así que no puede ser un ave. (¡Es un mamífero!)' },
      { q: 'Regla: si es invierno, el estanque se congela. El estanque está congelado. Entonces…', choices: ['Tiene que ser invierno', 'No puede ser invierno', 'Puede que sea invierno, pero no lo sabemos seguro'], hint: '¿La regla funciona al revés?', explain: 'La regla no dice que el estanque solo se congele en invierno, así que no lo sabemos seguro.' },
      { q: '«Si A, entonces B.» ¿Qué otra frase es siempre verdad?', choices: ['Si B, entonces A', 'Si no A, entonces no B', 'Si no B, entonces no A'], hint: 'Acuérdate de los caracoles: si no hay caracoles…', explain: 'Si B no pasó, A no pudo pasar: si no B, entonces no A.' },
      { q: 'Regla: si riegas la semilla, brota. La semilla no brotó. ¿Qué sabemos?', choices: ['No la regaron', 'La regaron', 'Es una piedrita'], hint: 'Si la hubieran regado, ¿qué habría pasado?', explain: 'Si la hubieran regado, habría brotado. No brotó, así que no la regaron.' }
    ]
  },
  'logic5-forest-logic-grid': {
    title: 'Tablas de lógica: ¿quién vive dónde?', topicName: 'Acertijos con tablas de lógica', blurb: 'Usa las pistas, tacha lo que no puede ser y encuentra la casa de cada animal.',
    reading: [
      { title: 'Una tabla de pistas', text: 'Un acertijo de tabla de lógica te da pistas, y tú descubres quién va dónde. Dibuja una tabla: los animales en el costado y las casas arriba.' },
      { title: 'Tacha lo que no puede ser', text: 'Cada pista te deja tachar casillas. «El búho no vive en el pino»: pon una ✗ en la casilla búho–pino.' },
      { title: 'Solo queda una', text: 'Cuando en una fila solo queda una casilla vacía, ¡esa tiene que ser la respuesta! Márcala y tacha esa casa para todos los demás.' },
      { title: 'Revisa todas las pistas', text: 'Al final, vuelve a leer todas las pistas para asegurarte de que tu respuesta encaja con todas.' }
    ],
    maphunt: {
      q: 'Cinco amigos viven alrededor del estanque. Lee cada pista, piensa ¡y toca la casa correcta!',
      map: { regions: [{ label: 'El bosque' }, { label: 'El estanque' }, { label: 'El pino' }, { label: 'El roble' }, { label: 'El tocón viejo' }, { label: 'El arce' }, { label: 'La casa-hongo' }] },
      clues: [
        { q: 'El búho duerme en un árbol que conserva sus agujas todo el invierno. ¿Dónde vive?', hint: '¿Qué árbol tiene agujas y no hojas?' },
        { q: 'La casa del erizo no es un árbol y está justo al lado del estanque. ¿Dónde?', hint: 'Dos casas no son árboles. Solo una de ellas toca la orilla del estanque.' },
        { q: 'La ardilla vive en un árbol que no está junto al estanque y que no es el del búho. ¿Dónde?', hint: 'Tacha los árboles que están junto al estanque y el pino.' },
        { q: '¡La rana está de visita en casa de un amigo! Está en la última casa que queda que no es ni un árbol ni el estanque. ¿Dónde?', hint: 'El erizo tiene el tocón. ¿Qué otra cosa no es un árbol?' },
        { q: 'El chochín vive en el único árbol que queda. ¿Dónde?', hint: 'El búho tiene el pino y la ardilla tiene el arce.' }
      ]
    },
    quiz: [
      { q: 'Bo no está en el roble ni en el pino. Hay tres árboles: roble, pino y abedul. ¿Dónde está Bo?', choices: ['En el roble', 'En el abedul', 'En el pino'], hint: 'Tacha los dos árboles donde Bo no está.', explain: 'Solo queda el abedul, así que Bo tiene que estar en el abedul.' },
      { q: 'En una tabla de lógica, ¿qué haces cuando una pista dice «no»?', choices: ['Pongo una marca de acierto en esa casilla', 'Me salto la pista', 'Pongo una cruz en esa casilla'], hint: 'El «no» descarta una casilla.', explain: 'Una pista con «no» descarta una casilla, así que le pones una cruz.' },
      { q: 'Una fila tiene cruces en todas las casillas menos una. ¿Qué quiere decir la casilla vacía?', choices: ['Tiene que ser la respuesta', 'Tiene que estar mal', 'Hay que empezar de nuevo'], hint: 'Todas las demás opciones están descartadas.', explain: 'Si todo lo demás está tachado, la última casilla vacía tiene que ser la respuesta.' },
      { q: 'Helecho, Musgo y Hiedra tienen un gorro rojo, uno azul y uno verde. El gorro de Helecho no es rojo ni azul. El de Musgo no es rojo. ¿De qué color es el gorro de Hiedra?', choices: ['Azul', 'Verde', 'Rojo'], hint: 'Primero averigua el gorro de Helecho y luego el de Musgo.', explain: 'El gorro de Helecho tiene que ser verde. El de Musgo no es rojo, así que es azul. Para Hiedra queda el rojo.' },
      { q: '¿Por qué hay que revisar todas las pistas al final?', choices: ['Para que el acertijo dure más', 'Para asegurarte de que tu respuesta encaja con todas', 'Porque la primera pista siempre está mal'], hint: 'Una buena respuesta está de acuerdo con todas las pistas.', explain: 'Revisar todas las pistas te asegura de que tu respuesta encaja con todas.' }
    ]
  },

  // ── Anillo 6: Anillos de Girasol ──
  'logic6-forest-symmetry': {
    title: 'La simetría en la naturaleza', topicName: 'Simetría', blurb: 'Ejes de simetría y simetría de rotación: por qué tanta naturaleza es igual por los dos lados.',
    reading: [
      { title: 'Simetría de espejo', text: 'Una figura tiene simetría de espejo (simetría axial) si una línea la divide en dos mitades que coinciden como un reflejo. Las alas de una mariposa son iguales a los dos lados de su cuerpo.' },
      { title: 'Muchos ejes de simetría', text: 'Algunas figuras tienen muchos ejes de simetría. Un copo de nieve perfecto tiene seis brazos y seis ejes de simetría. Una estrella de mar de cinco brazos tiene cinco.' },
      { title: 'Simetría de rotación', text: 'Una figura tiene simetría de rotación si se ve igual después de dar una parte de una vuelta. Gira una flor de cinco pétalos una quinta parte de vuelta y se verá exactamente igual.' },
      { title: 'Por qué a la naturaleza le gusta', text: 'Casi todos los animales que avanzan hacia delante tienen el lado izquierdo igual al derecho, y eso les ayuda a caminar, nadar o volar en línea recta. Muchas flores que miran al cielo son redondas y tienen simetría de rotación.' }
    ],
    sort: {
      q: '¿Qué tipo de simetría tiene cada uno? ¡Ordena las tarjetas de naturaleza de Nuez!',
      groups: [{ label: 'Un eje de simetría (izquierda igual a derecha)' }, { label: 'Muchos ejes, y de rotación' }, { label: 'Ningún eje de simetría' }],
      items: [
        { label: 'Mariposa' }, { label: 'Mariquita' }, { label: 'Cara de búho' }, { label: 'Cara de zorro' }, { label: 'Copo de nieve' }, { label: 'Estrella de mar' }, { label: 'Margarita' },
        { label: 'Manzana cortada por la mitad, de lado', hint: 'Corta una manzana por la mitad, de lado: ¡las semillas forman una estrella de cinco puntas!' },
        { label: 'Concha de caracol', hint: 'Una espiral gira hacia un lado: ninguna línea la divide en dos mitades iguales.' },
        { label: 'Cangrejo violinista', hint: 'El cangrejo violinista macho tiene una pinza gigante y otra pequeña.' },
        { label: 'Lenguado', hint: '¡Un lenguado adulto tiene los dos ojos en el mismo lado de la cabeza!' }
      ]
    },
    quiz: [
      { q: '¿Cuántos ejes de simetría tiene un copo de nieve perfecto de seis brazos?', choices: ['2', '1', '6'], hint: 'Uno que pasa por cada brazo…', explain: 'Un copo de nieve de seis brazos tiene seis ejes de simetría.' },
      { q: '¿Cuál tiene simetría de rotación?', choices: ['Una flor de cinco pétalos', 'Una concha de caracol', 'Un cangrejo violinista'], hint: '¿Cuál se ve igual después de dar una parte de una vuelta?', explain: 'Gira una flor de cinco pétalos una quinta parte de vuelta y se verá igual.' },
      { q: '¿Por qué muchos animales que avanzan hacia delante tienen el lado izquierdo igual al derecho?', choices: ['Así no se mojan', 'Les ayuda a moverse en línea recta', 'Así tienen mejor sabor'], hint: 'Piensa en caminar, nadar y volar.', explain: 'Tener los dos lados iguales ayuda a un animal a caminar, nadar o volar en línea recta.' },
      { q: 'Giras una estrella de mar de cinco brazos iguales. ¿Cuántas veces se ve igual en una vuelta completa?', choices: ['1', '10', '5'], hint: 'Cuenta los brazos.', explain: 'Se ve igual 5 veces en una vuelta completa: una por cada brazo.' },
      { q: 'El cangrejo violinista tiene una pinza gigante y otra pequeña. ¿Su cuerpo tiene simetría de espejo?', choices: ['No: sus lados no son iguales', 'Sí, perfecta'], hint: '¿Coincidirían las dos mitades en un espejo?', explain: 'Una pinza es mucho más grande, así que los dos lados no son iguales.' }
    ]
  },
  'logic6-forest-chances': {
    title: 'La probabilidad en números', topicName: 'Probabilidad', blurb: 'Cuenta las maneras y da la probabilidad con un número: 1 entre 4, 1 entre 2, 0 o 1.',
    reading: [
      { title: 'La probabilidad como número', text: 'Podemos dar la probabilidad con un número. «1 entre 4» quiere decir 1 manera de ganar entre 4 maneras igual de probables. Imposible es 0, seguro es 1, y las mismas posibilidades son 1 entre 2, o la mitad.' },
      { title: 'Cuenta las maneras', text: 'Una ruleta con 4 partes iguales (roja, azul, verde y amarilla) cae en verde de 1 manera entre 4. Así que la probabilidad es 1 entre 4, o ¼.' },
      { title: 'Más de un tipo', text: 'En una bolsa hay 3 bellotas marrones y 1 verde. Sacar una marrón pasa de 3 maneras entre 4: una probabilidad de 3 entre 4, o ¾.' },
      { title: 'Después de muchos intentos', text: 'Una probabilidad no promete lo que pasará la próxima vez. Lanza una moneda 4 veces y puede que salgan 3 caras. Pero en 1000 lanzamientos, cerca de la mitad serán cara.' }
    ],
    sort: {
      q: '¿Cuál es la probabilidad? ¡Ordena cada sorteo, giro y tirada!',
      groups: [{ label: '0: imposible' }, { label: '1 entre 4' }, { label: '1 entre 2' }, { label: '1: seguro' }],
      items: [
        { label: 'Una moneda sale cara' }, { label: 'Una ruleta mitad roja, mitad azul cae en rojo' },
        { label: 'Un dado sale par', hint: 'Los números pares de un dado son 2, 4 y 6. Son 3 de 6.' },
        { label: 'Una ruleta de 4 colores iguales cae en verde' }, { label: 'Sacas la única bellota dorada de entre 4 bellotas' }, { label: 'Sacas la carta A de entre las cartas A, B, C y D' },
        { label: 'Sacas una marrón de una bolsa con 4 bellotas marrones' }, { label: 'Un dado sale un número menor que 7' }, { label: 'Sacas una azul de una bolsa con 4 bellotas marrones' }, { label: 'Un dado sale 8' }
      ]
    },
    dig: {
      q: '¡Quita la tierra de las viejas piezas de juego de Nuez y resuelve sus acertijos de probabilidad!',
      finds: [
        { label: 'Dos monedas viejas', text: 'Dos monedas que se lanzan a la vez.', question: { q: '¿Qué es más probable: dos caras, o una cara y una cruz?', choices: ['Son igual de probables', 'Dos caras', 'Una cara y una cruz'], hint: 'Haz la lista de todas las maneras: CC, CX, XC, XX.', explain: 'Hay 4 maneras igual de probables: CC, CX, XC y XX. Una de cada pasa de 2 maneras entre 4; dos caras, solo de 1.' } },
        { label: 'Un dado de madera', text: 'Un dado justo: seis caras, numeradas del 1 al 6.', question: { q: 'Lo tiras 600 veces. ¿Cuántos seises esperarías, más o menos?', choices: ['Unos 100', 'Exactamente 6', 'Unos 300'], hint: 'La probabilidad de sacar un seis es 1 entre 6.', explain: '1 entre 6 de 600 tiradas son unos 100 seises. ¡No saldrán exactamente 100 todas las veces!' } },
        { label: 'Una ruleta', text: '4 partes iguales: 3 rojas y 1 azul.', question: { q: '¿Cuál es la probabilidad de que caiga en rojo?', choices: ['1 entre 3', '3 entre 4', '1 entre 4'], hint: '¿Cuántas de las 4 partes son rojas?', explain: '3 de las 4 partes iguales son rojas, así que la probabilidad es 3 entre 4.' } }
      ]
    },
    quiz: [
      { q: 'En una bolsa hay 2 canicas rojas y 2 azules. ¿Cuál es la probabilidad de sacar una roja?', choices: ['1 entre 4', 'Seguro', '1 entre 2'], hint: '¿Cuántas de las 4 son rojas?', explain: '2 de las 4 canicas son rojas: 2 entre 4, que es lo mismo que 1 entre 2.' },
      { q: '¿Qué número quiere decir imposible?', choices: ['0', '1', '½'], hint: 'Ninguna posibilidad…', explain: 'Imposible es 0, seguro es 1.' },
      { q: 'Lanzas una moneda justa y sale cara 3 veces seguidas. ¿Cuál es la probabilidad de que la próxima salga cara?', choices: ['Menos de 1 entre 2', 'Sigue siendo 1 entre 2', 'Seguro'], hint: '¿La moneda tiene memoria?', explain: 'Una moneda no tiene memoria: cada lanzamiento sigue siendo 1 entre 2.' },
      { q: 'Una ruleta tiene 8 partes iguales y 2 son amarillas. ¿Cuál es la probabilidad de amarillo?', choices: ['1 entre 8', '1 entre 2', '2 entre 8, que es 1 entre 4'], hint: '2 de 8…', explain: '2 entre 8 es lo mismo que 1 entre 4.' },
      { q: 'Al tirar un dado justo, ¿qué es más probable?', choices: ['Son igual de probables', 'Un número impar', 'Un seis'], hint: 'Cuenta los números impares de un dado.', explain: 'Los impares (1, 3, 5) salen de 3 maneras entre 6. El seis sale de 1 sola manera.' }
    ]
  },

  // ── Anillo 7: Corona Estelar ──
  'logic7-forest-line-graphs': {
    title: 'Gráficos de líneas y tendencias', topicName: 'Gráficos de líneas y tendencias', blurb: 'Lee un gráfico de líneas, descubre la tendencia y sabe qué no pueden decirte los datos.',
    reading: [
      { title: 'Cambios con el tiempo', text: 'Un gráfico de líneas une puntos para mostrar cómo cambia algo con el tiempo: la altura de un arbolito cada año, o la temperatura cada mes.' },
      { title: 'Lee los ejes', text: 'El tiempo suele ir abajo, a lo largo (el eje x). La cantidad va hacia arriba, en el costado (el eje y). Cada punto está encima de su momento, a la altura de su cantidad.' },
      { title: 'Descubre la tendencia', text: 'La tendencia es la dirección general: sube, baja o se mantiene. Una línea empinada indica un cambio rápido; una pendiente suave, un cambio lento.' },
      { title: 'Cuidado con lo que afirmas', text: 'Una tendencia no es una promesa: una línea que sube durante cinco años puede estabilizarse. Y que dos líneas suban juntas no demuestra que una cause la otra. Las ventas de helados y las quemaduras de sol suben las dos en verano, por culpa del sol.' }
    ],
    sort: {
      q: 'El arbolito de roble, medido cada primavera: 20 cm, 35 cm, 55 cm, 80 cm, 110 cm. ¿Verdadero, falso o no se sabe?',
      groups: [{ label: 'Verdadero' }, { label: 'Falso' }, { label: 'Los datos no lo dicen' }],
      items: [
        { label: 'Creció todos los años' },
        { label: 'Cada año creció más rápido', hint: 'Calcula cuánto creció cada año: 15, 20, 25, 30.' },
        { label: 'Creció 90 cm de la primera a la última medida' }, { label: 'Un año se encogió' },
        { label: 'En el último año creció 50 cm', hint: '¿Cuánto hay de 80 cm a 110 cm?' },
        { label: 'La próxima primavera medirá exactamente 145 cm', hint: 'Una tendencia no es una promesa.' },
        { label: 'Creció porque las primaveras fueron lluviosas', hint: '¿Hay algo sobre la lluvia en los datos?' },
        { label: 'Es el arbolito más alto del bosque' }
      ]
    },
    quiz: [
      { q: 'Temperaturas de enero a mayo: 2, 5, 9, 14, 18 °C. ¿Cuál es la tendencia?', choices: ['Baja', 'Sube', 'Se mantiene'], hint: '¿Los números se hacen más grandes o más pequeños?', explain: 'Cada mes hace más calor que el anterior: la tendencia es a subir.' },
      { q: 'En un gráfico de líneas, una parte empinada de la línea quiere decir…', choices: ['Que no hay cambio', 'Un error', 'Un cambio rápido'], hint: 'Un gran salto en poco tiempo…', explain: 'Una línea empinada quiere decir que la cantidad cambió mucho en poco tiempo.' },
      { q: 'Las ventas de chocolate caliente y de bufandas suben las dos en invierno. ¿Comprar bufandas hace que la gente compre chocolate caliente?', choices: ['Sí, siempre', 'No necesariamente: puede que el frío cause las dos cosas', 'No, las bufandas lo impiden'], hint: '¿Qué más cambia en invierno?', explain: 'Las dos suben por el frío. Que suban juntas no demuestra que una cause la otra.' },
      { q: 'Una línea se queda plana de marzo a junio. ¿Qué pasó?', choices: ['La cantidad se mantuvo igual', 'La cantidad se duplicó', 'El gráfico está roto'], hint: 'Plana quiere decir sin cambio.', explain: 'Una línea plana quiere decir que la cantidad se mantuvo igual.' },
      { q: '¿Dónde suele ir el tiempo en un gráfico de líneas?', choices: ['En el título', 'Hacia arriba, en el eje y', 'Abajo, a lo largo del eje x'], hint: 'Leemos el tiempo de izquierda a derecha.', explain: 'El tiempo suele ir abajo, a lo largo del eje x.' }
    ]
  },
  'logic7-forest-branching-keys': {
    title: 'Claves dicotómicas: ¿qué árbol es?', topicName: 'Claves dicotómicas y preguntas de sí o no', blurb: 'Sigue una clave de preguntas de sí o no, como una naturalista que identifica un árbol.',
    reading: [
      { title: 'Preguntas de sí o no', text: 'Una clave dicotómica (una clave de identificación) es una cadena de preguntas de sí o no. Cada respuesta te lleva por una rama, hasta que solo queda un nombre.' },
      { title: 'La clave de árboles de Nuez', text: '1. ¿Tiene agujas? SÍ → ve al 2. NO → ve al 3. 2. ¿Se le caen las agujas en otoño? SÍ: alerce. NO: pino. 3. ¿Las hojas tienen lóbulos redondeados, como dedos ondulados? SÍ: roble. NO: abedul.' },
      { title: 'Buenas preguntas', text: 'Una buena pregunta de clave divide el grupo, y cualquiera puede comprobarla. «¿Las hojas son agujas?» es buena. «¿Es bonito?» no lo es, porque cada persona opina distinto.' },
      { title: 'Claves por todas partes', text: 'Los naturalistas usan claves para identificar árboles, hongos, insectos y aves. La misma manera de pensar con sí o no hace funcionar también los programas de computadora.' }
    ],
    sort: {
      q: 'Usa la clave de árboles de Nuez con cada muestra: ¿alerce, pino, roble o abedul?',
      groups: [{ label: 'Alerce' }, { label: 'Pino' }, { label: 'Roble' }, { label: 'Abedul' }],
      items: [
        { label: 'Agujas que se vuelven doradas y caen en otoño', hint: '¿Agujas? Sí. ¿Caen en otoño? Sí.' },
        { label: 'Agujas suaves en mechones; pelado todo el invierno' }, { label: 'Agujas largas de dos en dos, verdes todo el invierno' }, { label: 'Agujas que duran todo el año, y piñas leñosas' },
        { label: 'Hojas con lóbulos redondeados y ondulados' }, { label: 'Hojas lobuladas junto a un montón de bellotas' },
        { label: 'Hojas pequeñas, dentadas y sin lóbulos', hint: 'Sin agujas y sin lóbulos…' },
        { label: 'Hojas en forma de triángulo y corteza blanca como el papel' }
      ]
    },
    quiz: [
      { q: '¿Qué tipo de preguntas usa una clave dicotómica?', choices: ['Adivinanzas sin respuesta', 'Preguntas de sí o no sobre rasgos que se pueden comprobar', 'Preguntas sobre tu color favorito'], hint: 'Cada respuesta te lleva por una rama.', explain: 'Una clave usa preguntas de sí o no sobre rasgos que cualquiera puede comprobar.' },
      { q: '¿Cuál es una buena pregunta para una clave?', choices: ['¿Tiene seis patas?', '¿Es bonito?', '¿Es mi favorito?'], hint: '¿Todo el mundo estaría de acuerdo con la respuesta?', explain: 'Cualquiera puede contar patas, así que todos obtienen la misma respuesta.' },
      { q: 'Con la clave: un árbol tiene agujas que siguen verdes todo el invierno. ¿Qué árbol es?', choices: ['Alerce', 'Abedul', 'Pino'], hint: 'Agujas: sí. ¿Caen en otoño?: no.', explain: 'Agujas que no se caen en otoño: un pino.' },
      { q: '¿Qué conífera pierde sus agujas en otoño?', choices: ['El alerce', 'El pino', 'La pícea'], hint: 'Está en la clave de Nuez.', explain: 'El alerce es una conífera que pierde sus agujas cada otoño.' },
      { q: 'Cada pregunta de sí o no divide un grupo justo por la mitad. ¿Cuántas preguntas necesitas para distinguir 8 cosas?', choices: ['8', '4', '3'], hint: '8 → 4 → 2 → 1.', explain: '8 se divide en 4, luego en 2, luego en 1: tres preguntas.' }
    ]
  },

  // ───────── Salón de las Raíces del Tiempo (La Tierra y el tiempo, Abuelo Zarzamora) ─────────
  // ── Anillo 1: Hueco de las Raíces ──
  'earth1-forest-seasons': {
    title: 'Las cuatro estaciones en el Gran Árbol', topicName: 'Las estaciones', blurb: 'Primavera, verano, otoño e invierno: mira cómo cambia el bosque durante todo el año.',
    reading: [
      { title: 'Cuatro estaciones', text: 'Muchos lugares tienen cuatro estaciones: primavera, verano, otoño e invierno. Cada una tiene su propio tiempo, y el bosque cambia con ellas.' },
      { title: 'Primavera y verano', text: 'En primavera, los días se hacen más largos y más cálidos, se abren los brotes y los pájaros hacen sus nidos. El verano es la estación más calurosa, con los días más largos.' },
      { title: 'Otoño e invierno', text: 'En otoño, muchos árboles pierden sus hojas y las ardillas esconden frutos secos. El invierno es la estación más fría, con los días más cortos. Algunos animales se lo pasan entero durmiendo.' },
      { title: 'Por qué hay estaciones', text: 'La Tierra está inclinada. Durante una parte del año, nuestra mitad de la Tierra se inclina hacia el Sol y recibe más luz: es el verano. Cuando se inclina hacia el otro lado, es invierno.' }
    ],
    dialogue: {
      npc: { name: 'Willow, la guardabosques', role: 'una guardabosques' },
      intro: '¡Hola! Soy Willow. Cuido estos bosques todo el año, así que veo llegar e irse cada estación. ¡Pregúntame lo que quieras!',
      topics: [
        { ask: '¿Qué pasa en primavera?', answer: '¡Todo se despierta! Los brotes se abren, las ranas ponen sus huevos en el estanque y los pájaros cantan para encontrar pareja. Además, los días se hacen más largos.' },
        { ask: '¿Qué te gusta del verano?', answer: '¡Los días largos y cálidos! Los árboles están llenos de hojas verdes y los pajaritos aprenden a volar. Llevo mi botella de agua en cada paseo.' },
        { ask: '¿Por qué se caen las hojas en otoño?', answer: 'Los días se hacen más cortos y más fríos, así que muchos árboles sueltan sus hojas y descansan durante el invierno. Primero las hojas se ponen amarillas, naranjas y rojas. ¡Cruj, cruj!' },
        { ask: '¿Adónde van los animales en invierno?', answer: 'Algunos se pasan el invierno durmiendo, como los erizos y los lirones. Algunos pájaros se van volando a lugares más cálidos. Y las ardillas desentierran los frutos secos que escondieron en otoño.' }
      ],
      challenge: { q: '¿En qué estación pierden sus hojas muchos árboles?', choices: ['Primavera', 'Otoño', 'Verano'], explain: 'En otoño los días se hacen más cortos y más fríos, y muchos árboles pierden sus hojas.' },
      farewell: 'Vuelve la próxima estación: ¡el bosque se verá distinto!'
    },
    sort: {
      q: '¡Ayuda a Willow a poner cada cosa en su estación!',
      groups: [{ label: 'Primavera' }, { label: 'Verano' }, { label: 'Otoño' }, { label: 'Invierno' }],
      items: [
        { label: 'Los brotes se abren' }, { label: 'Huevos de rana en el estanque' }, { label: 'Nacen los pajaritos' },
        { label: 'Días largos y calurosos' }, { label: 'Fresas silvestres maduras' }, { label: 'Nadar en el lago' },
        { label: 'Las hojas se ponen rojas y doradas' }, { label: 'Las ardillas entierran frutos secos' }, { label: 'Salen los hongos' },
        { label: 'Nieve en las ramas' },
        { label: 'Erizos profundamente dormidos', hint: 'Los erizos se pasan durmiendo la estación más fría.' },
        { label: 'Los días más cortos' }
      ]
    },
    quiz: [
      { q: '¿Cuál es la estación más calurosa?', choices: ['El invierno', 'El verano', 'El otoño'], hint: 'Piensa en días largos y calurosos.', explain: 'El verano es la estación más calurosa, con los días más largos.' },
      { q: '¿En qué estación se abren los brotes y las ranas ponen sus huevos?', choices: ['En primavera', 'En otoño', 'En invierno'], hint: 'Todo se despierta…', explain: 'En primavera el bosque se despierta: se abren los brotes y las ranas ponen sus huevos.' },
      { q: '¿Qué hacen los erizos en invierno?', choices: ['Vuelan al sur', 'Hacen muñecos de nieve', 'Se lo pasan durmiendo'], hint: 'Willow te lo contó.', explain: 'Los erizos se pasan el invierno durmiendo. Este largo sueño de invierno se llama hibernación.' },
      { q: '¿Qué estación tiene los días más cortos?', choices: ['El verano', 'El invierno', 'La primavera'], hint: 'También es la estación más fría.', explain: 'El invierno tiene los días más cortos y las noches más largas.' },
      { q: '¿Qué estación viene después del otoño?', choices: ['El invierno', 'La primavera', 'El verano'], hint: 'Primavera, verano, otoño, …', explain: 'Primavera, verano, otoño, invierno, y luego otra vez primavera.' }
    ]
  },
  'earth1-forest-weather': {
    title: '¿Qué tiempo hace hoy?', topicName: 'Tipos de tiempo', blurb: '¿Soleado, lluvioso, con viento o con nieve? Lee el cielo y vístete para él.',
    reading: [
      { title: 'El tiempo', text: 'El tiempo es cómo está el aire de afuera ahora mismo: soleado o nublado, cálido o frío, húmedo o seco, en calma o con viento.' },
      { title: 'Palabras del tiempo', text: 'Soleado, nublado, lluvioso, con viento, con nieve, con niebla, con tormenta. En el pronóstico del tiempo hay un dibujito para cada uno: un sol, una nube, gotas de lluvia, un copo de nieve.' },
      { title: 'Vístete para él', text: '¡Mira el tiempo antes de salir! Botas de lluvia e impermeable para la lluvia, un sombrero para el sol, un abrigo y manoplas para la nieve.' },
      { title: 'Pistas de la naturaleza', text: 'Algunas plantas muestran el tiempo. Una piña abre sus escamas cuando el aire está seco y las cierra cuando el aire está húmedo.' }
    ],
    dialogue: {
      npc: { name: 'Rowan, un pequeño observador del tiempo', role: 'un niño que lleva un diario del tiempo' },
      intro: '¡Hola! Soy Rowan. Cada mañana miro por la ventana de mi casa del árbol y dibujo el tiempo en mi diario. ¿Quieres verlo?',
      topics: [
        { ask: '¿Qué dibujaste hoy?', answer: '¡Un sol asomando detrás de una nube! Eso quiere decir intervalos de sol: a ratos soleado, a ratos nublado.' },
        { ask: '¿Cómo sabes si hace viento?', answer: 'Miro los árboles. Si las hojas bailan y las ramas se mueven, ¡hace viento! A las cometas les encantan los días de viento.' },
        { ask: '¿Cuál es tu tiempo favorito?', answer: '¡La nieve! Todo se queda en silencio y blanco. Pero también me gustan los días de lluvia, para saltar en los charcos con mis botas.' },
        { ask: '¿Una piña puede decir qué tiempo hace?', answer: '¡Más o menos! Cuando el aire está seco, sus escamas se abren. Cuando el aire está húmedo, se cierran. Muestra cuánta agua hay en el aire.' }
      ],
      challenge: { q: 'Rowan ve que las ramas se mueven y las hojas bailan. ¿Qué tiempo hace?', choices: ['Hay niebla', 'Nieva', 'Hace viento'], explain: 'Ramas que se mueven y hojas que bailan quieren decir que hace viento.' },
      farewell: '¡Gracias por venir! No te olvides de mirar el cielo mañana.'
    },
    sort: {
      q: '¿Qué debería llevar Rowan para salir? ¡Ordena las cosas según el tiempo para el que sirven!',
      groups: [{ label: 'Día de lluvia' }, { label: 'Día de sol' }, { label: 'Día de nieve' }],
      items: [
        { label: 'Botas de lluvia' }, { label: 'Paraguas' }, { label: 'Impermeable' },
        { label: 'Sombrero para el sol' }, { label: 'Gafas de sol' }, { label: 'Protector solar' },
        { label: 'Manoplas' }, { label: 'Bufanda de lana' }, { label: 'Trineo' }
      ]
    },
    artifact: { name: 'Una piña del tiempo', text: 'Las escamas de una piña protegen sus semillas. Cuando hace tiempo seco, las escamas se abren para que las semillas caigan y se vayan volando con el viento. Cuando hace tiempo húmedo, se cierran bien. Desde hace muchísimo tiempo, la gente cuelga piñas afuera como una sencilla señal del tiempo.' },
    quiz: [
      { q: '¿Qué es el tiempo?', choices: ['Cómo está el aire de afuera ahora mismo', 'Un tipo de árbol', 'El nombre de una nube'], hint: 'Soleado, lluvioso, con viento…', explain: 'El tiempo es cómo está el aire de afuera ahora mismo.' },
      { q: '¿Qué debes ponerte un día de lluvia?', choices: ['Un sombrero para el sol', 'Botas de lluvia e impermeable', 'Nada especial'], hint: '¡No te mojes!', explain: 'Las botas de lluvia y el impermeable te mantienen seco bajo la lluvia.' },
      { q: '¿Qué hace una piña cuando el aire está seco?', choices: ['Cierra sus escamas', 'Se pone azul', 'Abre sus escamas'], hint: 'El tiempo seco es bueno para que las semillas vuelen.', explain: 'Con el aire seco, las escamas se abren para que las semillas caigan y se las lleve el viento.' },
      { q: '¿Qué dibujo usaría el pronóstico del tiempo para la nieve?', choices: ['❄️', '☀️', '🌈'], hint: 'Piensa en algo frío y blanco.', explain: 'Un copo de nieve quiere decir nieve.' },
      { q: 'Los árboles que se mueven nos dicen que…', choices: ['Hay niebla', 'Hace viento', 'Nieva'], hint: 'Algo está empujando las ramas.', explain: 'El aire en movimiento, el viento, hace que los árboles se muevan.' }
    ]
  },

  // ── Anillo 2: Ramas de Helecho ──
  'earth2-forest-water-cycle': {
    title: '¿De dónde viene la lluvia?', topicName: 'El ciclo del agua', blurb: 'Sigue a una gota de lluvia hasta el cielo y de vuelta hacia abajo.',
    reading: [
      { title: 'Vueltas y más vueltas', text: 'El agua de la Tierra se usa una y otra vez. Sube al cielo, vuelve a bajar y sube otra vez. Este viaje se llama el ciclo del agua.' },
      { title: 'Arriba: evaporación', text: 'El Sol calienta los charcos, los lagos y el mar. Una parte del agua se convierte en un gas invisible llamado vapor de agua y sube al aire. Las hojas también sueltan vapor de agua.' },
      { title: 'Nubes: condensación', text: 'Allá arriba, el aire está más frío. El vapor se enfría y se convierte en gotitas de agua diminutas. Millones de gotitas juntas forman una nube.' },
      { title: 'Abajo: precipitación', text: 'Cuando las gotitas se juntan y pesan demasiado, caen como lluvia, o como nieve o granizo si hace frío. Luego el agua corre hacia los ríos y vuelve al mar.' }
    ],
    dialogue: {
      npc: { name: 'Brook, científica del agua', role: 'una científica que estudia la lluvia y los ríos' },
      intro: '¡Hola! Soy Brook. Estudio adónde va el agua: desde las nubes, a través del bosque, hasta los ríos y el mar.',
      topics: [
        { ask: '¿La lluvia es agua nueva?', answer: '¡No! El agua de tu gota de lluvia ha dado la vuelta al ciclo del agua muchísimas veces. ¡Puede que una parte haya estado en un charco, en un río o hasta en lo que bebió un dinosaurio!' },
        { ask: '¿Por qué desaparecen los charcos?', answer: 'El Sol y el viento ayudan a que el agua se evapore. Se convierte en vapor de agua y sube al aire, donde no la puedes ver.' },
        { ask: '¿En qué se diferencian la lluvia, la nieve y el granizo?', answer: 'Todos son agua que cae de las nubes. La lluvia es agua líquida. La nieve son cristales de hielo que crecieron en nubes frías. El granizo son bolitas de hielo que crecen dentro de grandes nubes de tormenta.' },
        { ask: '¿Cómo ayudan los árboles al ciclo del agua?', answer: 'Los árboles beben agua por sus raíces y sueltan vapor de agua por unos agujeritos de sus hojas. Un gran bosque devuelve muchísima agua al aire.' }
      ],
      challenge: { q: '¿Cómo se llama cuando el vapor de agua se enfría y se convierte en gotitas?', choices: ['Evaporación', 'Condensación', 'Fusión'], explain: 'Condensación: el vapor se enfría y se convierte en gotitas, y las gotitas forman nubes.' },
      farewell: 'La próxima vez que llueva, ¡piensa en el largo viaje que han hecho tus gotas de lluvia!'
    },
    sort: {
      q: '¿En qué parte de su viaje está el agua? ¡Ordena las tarjetas de Brook!',
      groups: [{ label: 'Subiendo (evaporación)' }, { label: 'Formando nubes (condensación)' }, { label: 'Cayendo (precipitación)' }, { label: 'Volviendo (recolección)' }],
      items: [
        { label: 'Un charco que se seca al sol' }, { label: 'Hojas que sueltan vapor de agua' }, { label: 'Agua de mar calentada por el Sol' },
        { label: 'Gotitas que se juntan allá arriba' },
        { label: 'Vaho en una ventana fría', hint: 'El vapor de agua del aire se enfría al tocar el vidrio frío y se convierte en gotitas.' },
        { label: 'Una nube blanca y esponjosa' },
        { label: 'Gotas de lluvia' }, { label: 'Copos de nieve' }, { label: 'Granizos' },
        { label: 'Un arroyo que baja por la ladera' }, { label: 'Un río que llega al mar' }, { label: 'Lluvia que empapa la tierra' }
      ]
    },
    sim: { predict: { q: 'Brook calienta una olla de agua. ¿Qué sube de ella?', choices: ['Humo', 'Vapor de agua, que forma vaho al enfriarse', 'Nada de nada'], explain: 'El calor convierte el agua en vapor de agua. Justo encima de la olla se enfría y forma gotitas diminutas: ¡el vaho que ves es una nubecita!' } },
    quiz: [
      { q: '¿Cómo se llama cuando el Sol convierte el agua en vapor de agua?', choices: ['Evaporación', 'Condensación', 'Precipitación'], hint: 'El agua sube…', explain: 'La evaporación convierte el agua líquida en vapor de agua, que sube al aire.' },
      { q: '¿De qué está hecha una nube?', choices: ['De algodón', 'De humo', 'De gotitas de agua o trocitos de hielo'], hint: 'Piensa en la condensación.', explain: 'Las nubes están hechas de millones de gotitas de agua o cristales de hielo.' },
      { q: 'La lluvia, la nieve y el granizo son tipos de…', choices: ['Evaporación', 'Precipitación', 'Viento'], hint: 'Agua que cae de las nubes.', explain: 'El agua que cae de las nubes se llama precipitación.' },
      { q: '¿Adónde llevan su agua la mayoría de los ríos al final?', choices: ['De vuelta al mar', 'A la Luna', 'A las nubes para siempre'], hint: 'Sigue un río cuesta abajo.', explain: 'Los ríos bajan hasta el mar, y el ciclo vuelve a empezar.' },
      { q: '¿El agua de la lluvia de hoy es completamente nueva?', choices: ['Sí, las nubes hacen agua nueva', 'No, ha dado la vuelta al ciclo muchas veces'], hint: 'Brook te habló de los dinosaurios.', explain: 'La misma agua da vueltas y vueltas en el ciclo del agua, una y otra vez.' }
    ]
  },
  'earth2-forest-clouds': {
    title: 'Leer las nubes', topicName: 'Tipos de nubes', blurb: 'Conoce a Luke Howard, que puso nombre a las nubes, y encuentra cada tipo en el cielo.',
    reading: [
      { title: 'Las nubes tienen nombre', text: 'En 1802, Luke Howard, un joven químico de Londres al que le encantaba mirar el cielo, les puso nombres en latín a las nubes. Todavía hoy usamos sus nombres.' },
      { title: 'Cúmulos y estratos', text: 'Los cúmulos son montones esponjosos, como algodón u ovejas, y suelen indicar buen tiempo. Los estratos son capas grises y planas que cubren el cielo y pueden traer llovizna.' },
      { title: 'Cirros', text: 'Los cirros son mechones finos y deshilachados, muy altos en el cielo, hechos de cristales de hielo. Pueden ser una señal de que el tiempo va a cambiar.' },
      { title: 'Cumulonimbos', text: 'Un cumulonimbo es una torre gigante de nubes. Trae lluvia fuerte, truenos y relámpagos, y a veces granizo. ¡Hora de entrar en casa!' }
    ],
    dialogue: {
      npc: { name: 'Luke Howard, que puso nombre a las nubes', role: 'químico y observador de nubes (1772–1864)' },
      intro: '¡Buenos días! Soy Luke Howard. Desde niño me encanta ver las nubes pasar sobre Londres. ¡Un día decidí que se merecían nombres de verdad!',
      topics: [
        { ask: '¿Por qué les pusiste nombre a las nubes?', answer: 'Las nubes cambian de forma todo el tiempo, así que la gente pensaba que eran demasiado desordenadas para clasificarlas. Pero yo vi que hay unos pocos tipos principales. Cuando las cosas tienen nombre, los científicos pueden hablar de ellas con claridad.' },
        { ask: '¿Por qué nombres en latín?', answer: 'En mi época, los científicos de todo el mundo sabían leer latín. Así, un científico de Francia o de Alemania podía usar exactamente los mismos nombres que yo.' },
        { ask: '¿Qué quiere decir «cúmulo»?', answer: 'Quiere decir «montón» o «pila». Estrato quiere decir «capa», cirro quiere decir «rizo de pelo» y nimbo quiere decir «nube de lluvia».' },
        { ask: '¿A la gente le gustaron tus nombres?', answer: '¡Muchísimo! Después de mi charla de 1802, los artistas empezaron a pintar mis nubes y los poetas escribieron sobre ellas. Hasta el gran escritor Goethe me dedicó un poema.' }
      ],
      challenge: { q: '¿Qué quiere decir «cúmulo»?', choices: ['Lluvia', 'Hielo', 'Montón'], explain: 'Cúmulo quiere decir «montón»: un cúmulo es un montón esponjoso de nube.' },
      farewell: 'Mira hacia arriba siempre que puedas: ¡el cielo es el mejor espectáculo que hay!'
    },
    maphunt: {
      q: '¡Ayuda a Luke Howard a encontrar dónde vive cada tipo de nube en el cielo!',
      map: { regions: [{ label: 'Muy arriba, donde hay hielo' }, { label: 'En medio del cielo' }, { label: 'Bajo, sobre las colinas' }, { label: 'Abajo, en el suelo' }, { label: 'La torre de tormenta' }] },
      clues: [
        { q: 'Los cirros deshilachados flotan muy alto, donde hace tanto frío que hay hielo. ¡Toca dónde están!', hint: 'Sube hasta lo más alto del cielo.' },
        { q: 'Los estratos grises y planos cuelgan bajos sobre las colinas. ¿Dónde?', hint: 'Bajo quiere decir cerca de las colinas, pero no en el suelo.' },
        { q: '¡La niebla es una nube que toca el suelo! ¿Dónde está?', hint: 'Mira justo abajo del todo.' },
        { q: 'Filas de nubecitas esponjosas, como escamas de pez o un rebaño de ovejas, están en medio del cielo. ¡Toca ahí!', hint: 'Ni arriba del todo ni abajo del todo…' },
        { q: 'Un cumulonimbo crece como una torre gigante, desde abajo hasta muy arriba. ¡Encuéntralo!', hint: 'Busca la nube alta que cruza todas las capas.' }
      ]
    },
    quiz: [
      { q: '¿Quién les puso a las nubes los nombres que todavía usamos?', choices: ['Galileo', 'Luke Howard', 'Charles Darwin'], hint: 'Le encantaba mirar el cielo de Londres.', explain: 'Luke Howard puso nombre a las nubes en 1802.' },
      { q: '¿Qué nube trae truenos y relámpagos?', choices: ['El cumulonimbo', 'El cirro', 'El cúmulo de buen tiempo'], hint: 'La torre gigante…', explain: 'El cumulonimbo, la torre gigante de tormenta, trae truenos, relámpagos y lluvia fuerte.' },
      { q: '¿De qué están hechos los cirros?', choices: ['De humo', 'De algodón', 'De cristales de hielo'], hint: 'Están muy altos, donde todo se congela.', explain: 'Los cirros están tan altos que están hechos de cristales de hielo.' },
      { q: '¿Qué es la niebla?', choices: ['Humo de una fogata', 'Una nube que toca el suelo', 'Nieve muy fina'], hint: 'La encontraste abajo del todo en el mapa del cielo.', explain: 'La niebla es una nube que se forma justo a ras del suelo.' },
      { q: 'Los montones esponjosos y blancos de nube en un día de sol son…', choices: ['Cúmulos', 'Estratos', 'Cumulonimbos'], hint: 'Cúmulo quiere decir «montón».', explain: 'Los montones esponjosos son cúmulos, que suelen indicar buen tiempo.' }
    ]
  },

  // ── Anillo 3: Ramas de Farolillos ──
  'earth3-forest-soil': {
    title: '¿De qué está hecho el suelo?', topicName: 'El suelo y sus capas', blurb: 'Cava un hoyo en el suelo y descubre qué hay en cada capa.',
    reading: [
      { title: 'Más que tierra', text: 'El suelo es una mezcla de trocitos de roca rota, hojas y ramitas podridas (llamadas humus), agua y aire. ¡Y está lleno de seres vivos!' },
      { title: 'Capas', text: 'Cava un hoyo profundo y verás capas. Arriba están las hojas caídas. Luego viene la capa superior del suelo, oscura, llena de humus y raíces. Luego el subsuelo, más claro y con piedras. Abajo del todo está la roca sólida: la roca madre.' },
      { title: 'El suelo tarda en hacerse', text: 'La lluvia, la escarcha y las raíces rompen la roca en trocitos, y las lombrices y los hongos mezclan en ella las plantas podridas. Puede tardar cientos de años en formarse una capa de suelo tan gruesa como tu dedo.' },
      { title: 'Las lombrices ayudan', text: 'Las lombrices de tierra hacen túneles en el suelo, que dejan entrar aire y agua, y arrastran hojas hacia abajo para comérselas. Sus excrementos hacen el suelo más rico.' }
    ],
    dialogue: {
      npc: { name: 'Dr. Clay, científico del suelo', role: 'un científico que estudia el suelo' },
      intro: '¡Hola, exploradora o explorador! Soy el doctor Clay. Casi todo el mundo pisa el suelo sin pensar en él, ¡pero yo creo que es una de las cosas más asombrosas de la Tierra!',
      topics: [
        { ask: '¿De qué está hecho el suelo?', answer: 'De roca rota en trocitos, restos de plantas podridas llamados humus, agua y aire. ¡Y de seres vivos! Una cucharada de suelo sano puede tener miles de millones de seres vivos diminutos, demasiado pequeños para verlos.' },
        { ask: '¿Por qué la capa superior del suelo es oscura?', answer: 'Porque está llena de humus: hojas viejas, raíces y bichitos que se han podrido. El humus es como comida para las plantas.' },
        { ask: '¿En qué se diferencian la arena y la arcilla?', answer: 'Los granos de arena son lo bastante grandes para verlos y se notan ásperos, y el agua pasa entre ellos muy rápido. Los trocitos de arcilla son superdiminutos y pegajosos, y retienen el agua.' },
        { ask: '¿Cómo puedo ayudar al suelo?', answer: 'Deja que las hojas caídas se pudran donde están, añade compost y no pises demasiado el suelo desnudo. ¡Y dales las gracias a las lombrices!' }
      ],
      challenge: { q: '¿Qué es el humus?', choices: ['Un tipo de roca', 'Restos podridos de plantas y animales en el suelo', 'Un bicho que come tierra'], explain: 'El humus es en lo que se convierten las hojas viejas, las raíces y los bichitos cuando se pudren. Hace que la capa superior del suelo sea oscura y rica.' },
      farewell: '¡Feliz excavación! Con cuidado, eso sí.'
    },
    dig: {
      q: '¡Cava un hoyo en el suelo con el doctor Clay y descubre qué hay en cada capa!',
      finds: [
        { label: 'Hojarasca', text: 'La capa de arriba son hojas y ramitas caídas que se pudren poco a poco.', question: { q: '¿En qué se convertirán estas hojas viejas?', choices: ['En plástico', 'En humus, comida para el suelo', 'En rocas nuevas'], hint: 'Se pudren poco a poco…', explain: 'Las lombrices, los hongos y los seres vivos diminutos descomponen las hojas y las convierten en humus.' } },
        { label: 'Una lombriz de tierra', text: 'Las lombrices de tierra viven en la capa superior del suelo, la oscura.', question: { q: '¿Cómo ayudan las lombrices al suelo?', choices: ['Hacen túneles para el aire y el agua', 'Hacen que el suelo se congele', 'Se comen las rocas'], hint: 'Piensa en sus túneles.', explain: 'Los túneles de las lombrices dejan entrar aire y agua en el suelo, y sus excrementos lo hacen más rico.' } },
        { label: 'Piedras en el subsuelo', text: 'Más abajo, el suelo es más claro, con más piedras y menos humus.', question: { q: '¿Por qué el subsuelo es más claro que la capa de arriba?', choices: ['Está pintado', 'Está hecho de nieve', 'Tiene menos humus'], hint: '¿Qué hace oscura la capa de arriba?', explain: 'El humus hace oscura la capa de arriba. El subsuelo tiene mucho menos, así que es más claro.' } },
        { label: 'Roca madre', text: 'Abajo del todo hay roca sólida: la roca madre. El suelo se forma cuando una roca como esta se rompe poco a poco en trocitos.', question: { q: '¿Qué convierte la roca en trocitos de suelo, muy despacio?', choices: ['La lluvia, la escarcha y las raíces', 'Un solo día de sol', 'El canto de los pájaros'], hint: 'Piensa en el agua que se congela en las grietas y en las raíces que empujan.', explain: 'La lluvia, la escarcha y las raíces que crecen rompen la roca en trozos cada vez más pequeños durante muchos años.' } }
      ]
    },
    quiz: [
      { q: '¿Cuál de estas cosas NO es una parte natural del suelo?', choices: ['Trocitos de roca', 'Juguetes de plástico', 'Humus'], hint: 'El suelo lo hace la naturaleza.', explain: 'El suelo está hecho de trocitos de roca, humus, agua, aire y seres vivos. El plástico no debería estar ahí.' },
      { q: '¿Cuál es la capa más profunda?', choices: ['La capa superior del suelo', 'La hojarasca', 'La roca madre'], hint: 'Es roca sólida.', explain: 'La roca madre es la roca sólida que está abajo del todo.' },
      { q: '¿Qué suelo retiene mejor el agua?', choices: ['La arcilla', 'La arena', 'La grava'], hint: 'Sus trocitos son diminutos y pegajosos.', explain: 'Los trocitos diminutos y pegajosos de la arcilla retienen el agua. El agua pasa rápido por la arena y la grava.' },
      { q: '¿Por qué la capa superior del suelo es oscura?', choices: ['Es pintura húmeda', 'Está llena de humus', 'Siempre está a la sombra'], hint: 'El doctor Clay te lo contó.', explain: 'La capa superior es oscura porque está llena de humus: hojas y raíces podridas.' },
      { q: '¿Cuánto puede tardar en formarse una capa de suelo tan gruesa como tu dedo?', choices: ['Un día', 'Una semana', 'Cientos de años'], hint: 'El suelo tarda muchísimo en hacerse.', explain: 'Puede tardar cientos de años. ¡Por eso el suelo es tan valioso!' }
    ]
  },
  'earth3-forest-fossils': {
    title: 'Fósiles: historias en la piedra', topicName: 'Fósiles y capas de roca', blurb: '¿Cómo se convierten en piedra las conchas, los huesos y las huellas? Lee las capas de roca como una línea del tiempo.',
    reading: [
      { title: '¿Qué es un fósil?', text: 'Un fósil son los restos o el rastro de un ser vivo de hace muchísimo tiempo, guardados en la roca. Las conchas, los huesos, los dientes, las hojas y hasta las huellas pueden convertirse en fósiles.' },
      { title: 'Cómo se forman los fósiles', text: 'Una planta o un animal queda enterrado rápidamente en barro o arena. Durante millones de años, el barro se convierte en roca y los minerales van rellenando la forma poco a poco. ¡Se convierte en piedra!' },
      { title: 'Icnofósiles', text: 'Algunos fósiles no son partes del cuerpo: son huellas, madrigueras, nidos ¡y hasta caca de dinosaurio! Se llaman icnofósiles o fósiles traza, y muestran lo que hacían los seres vivos.' },
      { title: 'Las capas de roca son una línea del tiempo', text: 'La roca se forma en capas, una encima de otra. Normalmente, las capas más profundas son más antiguas. Los fósiles de las capas profundas vivieron antes que los fósiles de cerca de la superficie.' }
    ],
    dialogue: {
      npc: { name: 'Pebble, una pequeña cazadora de fósiles', role: 'una niña que busca fósiles' },
      intro: '¡Hola! Soy Pebble. Busco fósiles en acantilados y orillas de ríos. ¡Ayer encontré una concha enrollada de millones de años!',
      topics: [
        { ask: '¿Qué encontraste?', answer: '¡Un amonites! Era un animal marino con una concha enrollada, parecida a la de un caracol, que vivió en la época de los dinosaurios. Los amonites se extinguieron hace unos 66 millones de años.' },
        { ask: '¿Cualquier cosa puede convertirse en fósil?', answer: 'Casi todos los seres vivos simplemente se pudren. Para convertirse en fósil, normalmente tienen que quedar enterrados rápido en barro o arena, donde no se pudren tan fácilmente. ¡Por eso los fósiles son tesoros raros!' },
        { ask: '¿Dónde debería buscar fósiles?', answer: 'En rocas hechas de capas de barro y arena, como algunos acantilados y canteras. Ve siempre con una persona adulta, aléjate de las rocas que se pueden caer y en la playa mira la marea.' },
        { ask: '¿Cómo sabemos la edad de un fósil?', answer: 'Las capas de roca ayudan: las capas más profundas suelen ser más antiguas. Los científicos también pueden medir cambios diminutos dentro de algunas rocas que funcionan como un reloj muy lento.' }
      ],
      challenge: { q: '¿Cuál de estos es un icnofósil?', choices: ['Un hueso de dinosaurio', 'Una huella de dinosaurio', 'Un diente de tiburón'], explain: 'Una huella muestra lo que hizo un animal, no una parte de su cuerpo: por eso es un icnofósil.' },
      farewell: 'Mantén los ojos bien abiertos: ¡la próxima piedra que recojas podría guardar un secreto!'
    },
    timeline: {
      title: 'La vida escrita en las rocas',
      events: [
        { label: 'Los primeros peces nadan en el mar', when: 'hace unos 520 millones de años' },
        { label: 'Crecen los primeros árboles y se extienden los bosques', when: 'hace unos 385 millones de años' },
        { label: 'Aparecen los primeros dinosaurios', when: 'hace unos 230 millones de años' },
        { label: 'Se extinguen los amonites y los grandes dinosaurios', when: 'hace unos 66 millones de años' },
        { label: 'Aparece nuestra propia especie, los seres humanos', when: 'hace unos 300 000 años' }
      ]
    },
    quiz: [
      { q: '¿Qué es un fósil?', choices: ['Una piedrita nueva y brillante', 'Los restos o el rastro de un ser vivo de hace mucho tiempo, guardados en la roca', 'Un tipo de planta'], hint: 'Historias en la piedra…', explain: 'Un fósil es lo que queda en la roca de un ser vivo, o de lo que hizo, hace mucho tiempo.' },
      { q: '¿Qué capa de roca suele ser la más antigua?', choices: ['La más profunda', 'La de arriba', 'Todas tienen la misma edad'], hint: 'Las capas nuevas se depositan encima de las viejas.', explain: 'Las capas se van apilando unas encima de otras, así que las más profundas suelen ser las más antiguas.' },
      { q: '¿Por qué la mayoría de los seres vivos nunca se convierten en fósiles?', choices: ['Pesan demasiado', 'Se van volando', 'Se pudren antes de quedar enterrados'], hint: 'Los fósiles necesitan un entierro rápido.', explain: 'Casi todos los seres vivos se pudren. Solo los que quedan enterrados rápido tienen una oportunidad de convertirse en fósiles.' },
      { q: '¿Cuándo se extinguieron los amonites y los grandes dinosaurios?', choices: ['Hace unos 66 millones de años', 'El año pasado', 'Hace unos 100 años'], hint: 'Mira tu línea del tiempo.', explain: 'Se extinguieron hace unos 66 millones de años, mucho antes de los primeros seres humanos.' },
      { q: '¿Qué debes hacer siempre cuando buscas fósiles en una playa?', choices: ['Escalar los acantilados solo', 'Ir con una persona adulta y mirar la marea', 'Cavar debajo del acantilado'], hint: '¡La seguridad es lo primero!', explain: 'Ve siempre con una persona adulta, aléjate de las rocas que se pueden caer y mira la marea.' }
    ]
  },

  // ── Anillo 4: Copa en Flor ──
  'earth4-forest-rivers': {
    title: 'Cómo los ríos dan forma a la tierra', topicName: 'Los ríos y la erosión', blurb: 'De un manantial diminuto hasta el mar: cómo los ríos tallan valles, curvas y tierra nueva.',
    reading: [
      { title: 'Del nacimiento al mar', text: 'Un río empieza en su nacimiento, que suele ser un manantial o nieve que se derrite en lo alto de las colinas. Baja cuesta abajo, se le unen arroyos más pequeños, hasta llegar a su desembocadura en el mar o en un lago.' },
      { title: 'Desgastar la tierra', text: 'El agua rápida arrastra piedras y arena que raspan el lecho del río. Este desgaste se llama erosión. Durante miles de años, un río puede tallar un valle profundo.' },
      { title: 'Curvas y vueltas', text: 'En terreno más llano, el río va más despacio y hace grandes curvas llamadas meandros. El agua corre más rápido por la parte de fuera de la curva, desgastando la orilla, y deja arena en la parte de dentro.' },
      { title: 'Soltar su carga', text: 'Donde el río va más despacio al llegar al mar, suelta el barro y la arena que llevaba. Con el tiempo, eso puede formar tierra nueva llamada delta.' }
    ],
    dialogue: {
      npc: { name: 'Fen, guía del río', role: 'un guía del río que rema en canoa' },
      intro: '¡Ah del río! Soy Fen. He remado por este río desde las colinas hasta el mar. ¡Súbete a mi canoa y te enseñaré cómo da forma a la tierra!',
      topics: [
        { ask: '¿Dónde empieza el río?', answer: 'Allá arriba, en las colinas, como un pequeño manantial que brota del suelo. ¡Ahí es tan pequeño que podrías pasar por encima de un paso!' },
        { ask: '¿Por qué el agua va tan rápido en las colinas?', answer: 'El terreno está empinado, así que el agua baja corriendo. El agua rápida puede hacer rodar piedras y tallar un valle empinado con forma de V.' },
        { ask: '¿Cómo se forma una cascada?', answer: 'Donde un río pasa de una roca dura a una roca más blanda, la roca blanda se desgasta más rápido. Se forma un escalón y el agua cae por él.' },
        { ask: '¿Por qué el río hace tantas curvas cerca del mar?', answer: 'El terreno es llano, así que el río va más despacio y se balancea en grandes curvas llamadas meandros. A veces una curva queda cortada y se convierte en un lago curvo: ¡un lago de herradura!' }
      ],
      challenge: { q: '¿Cómo se llama el desgaste de la tierra por el agua en movimiento?', choices: ['Evaporación', 'Hibernación', 'Erosión'], explain: 'La erosión es el desgaste de la tierra por el agua, el viento o el hielo en movimiento.' },
      farewell: '¡Rema con cuidado! Y recuerda: los ríos siempre están trabajando, aunque parezcan tranquilos.'
    },
    maphunt: {
      q: '¡Baja por el río con Fen, desde el manantial hasta el mar!',
      map: { regions: [{ label: 'La llanura' }, { label: 'Las colinas' }, { label: 'El río' }, { label: 'El manantial (el nacimiento)' }, { label: 'La cascada' }, { label: 'Las grandes curvas (meandros)' }, { label: 'El lago de herradura' }, { label: 'El delta' }, { label: 'El mar' }] },
      clues: [
        { q: 'Todo río empieza en algún sitio. Toca el nacimiento del río, en lo alto de las colinas.', hint: 'Busca un pequeño manantial arriba a la izquierda.' },
        { q: 'Aquí el río cae por un escalón de roca dura. ¿Dónde?', hint: 'Donde las colinas se juntan con la llanura.' },
        { q: 'En el terreno llano, el río da grandes vueltas. ¡Encuentra los meandros!', hint: 'Busca la parte que serpentea en el medio.' },
        { q: 'Una curva quedó cortada y se convirtió en un lago curvo. ¡Tócalo!', hint: 'Está debajo de las curvas, solito.' },
        { q: 'El río va más despacio y suelta su barro, formando tierra nueva. ¿Dónde?', hint: 'Justo antes de que el río llegue al mar.' },
        { q: '¿Dónde termina el río su viaje?', hint: 'Ve lo más al este que puedas.' }
      ]
    },
    quiz: [
      { q: '¿Dónde empieza un río?', choices: ['En su desembocadura', 'En su nacimiento', 'En el delta'], hint: 'Suele ser un manantial en lo alto de las colinas.', explain: 'Un río empieza en su nacimiento, que suele ser un manantial o nieve que se derrite.' },
      { q: '¿Qué es un meandro?', choices: ['Una gran curva de un río', 'Un tipo de pez', 'Una cascada'], hint: 'El río de Fen serpenteaba cerca del mar.', explain: 'Un meandro es una curva grande y muy cerrada de un río.' },
      { q: 'En la curva de un río, ¿dónde va más rápido el agua?', choices: ['En la parte de dentro de la curva', 'Va igual en todas partes', 'En la parte de fuera de la curva'], hint: '¿Qué orilla se desgasta?', explain: 'El agua corre más rápido por la parte de fuera de la curva, así que esa orilla se desgasta.' },
      { q: '¿De qué está hecho un delta?', choices: ['De hielo', 'Del barro y la arena que soltó el río', 'De raíces de árboles'], hint: 'El río va más despacio al llegar al mar…', explain: 'Un delta es tierra nueva formada con el barro y la arena que soltó el río.' },
      { q: '¿Cómo se forma una cascada?', choices: ['La roca más blanda de abajo se desgasta más rápido que la roca dura de arriba', 'Alguien construye un muro', 'El río se congela'], hint: 'Roca dura y roca blanda…', explain: 'La roca blanda de abajo se desgasta más rápido y deja un escalón de roca dura por el que cae el agua.' }
    ]
  },
  'earth4-forest-wind': {
    title: 'El viento: aire en movimiento', topicName: 'El viento', blurb: 'Qué hace soplar el viento, de dónde viene y qué fuerza tiene.',
    reading: [
      { title: '¿Qué es el viento?', text: 'El viento es aire que se mueve de un lugar a otro. No podemos ver el aire, pero sí lo que hace: las hojas bailan, las nubes se desplazan y las cometas vuelan.' },
      { title: 'Por qué se mueve el aire', text: 'El Sol calienta unos lugares más que otros. El aire caliente sube y el aire más fresco llega corriendo a ocupar su lugar. Ese aire que corre es el viento.' },
      { title: '¿Hacia dónde?', text: 'Un viento lleva el nombre del lugar DE DONDE viene: un viento del oeste sopla desde el oeste hacia el este. La flecha de una veleta apunta hacia el viento, hacia donde viene.' },
      { title: '¿Con qué fuerza?', text: 'En 1805, Francis Beaufort, un oficial de la marina, creó una escala del 0 al 12 que describe el viento por lo que se puede ver: desde el humo que sube recto (0) hasta un huracán (12). Es la escala de Beaufort.' }
    ],
    dialogue: {
      npc: { name: 'Gale, fabricante de cometas', role: 'fabricante de cometas que sabe leer el viento' },
      intro: '¡Fiuuu! ¡Hola! Soy Gale. Hago cometas, así que tengo que ser experta en viento. ¿Averiguamos hacia dónde sopla hoy?',
      topics: [
        { ask: '¿Por qué sopla el viento?', answer: 'Porque el Sol no calienta el suelo por igual. El aire caliente sube y el aire fresco entra por debajo. En la playa, en un día de sol, puedes sentir una brisa fresca que viene del mar.' },
        { ask: '¿Cómo sabes de dónde viene el viento?', answer: 'Miro mi veleta: su flecha apunta hacia el viento. O levanto un dedo mojado: ¡el lado que se siente más frío es el que mira hacia el viento!' },
        { ask: '¿Cuál es el mejor viento para las cometas?', answer: 'Una brisa constante, cuando las hojas y las ramitas no paran de moverse. Con poco viento la cometa se cae; ¡con demasiado tira con mucha fuerza!' },
        { ask: '¿Cómo ayuda el viento a las plantas?', answer: 'Lleva sus semillas y su polen muy lejos. Las semillas del diente de león y los «helicópteros» del arce viajan con el viento a lugares nuevos.' }
      ],
      challenge: { q: 'Un viento del oeste sopla…', choices: ['Hacia el oeste', 'Desde el oeste', 'Hacia arriba'], explain: 'Los vientos llevan el nombre del lugar de donde vienen, así que un viento del oeste sopla desde el oeste.' },
      farewell: '¡Que el viento sea perfecto para tu cometa!'
    },
    sort: {
      q: '¿Con qué fuerza sopla el viento? ¡Ordena lo que vio Gale con la escala de Beaufort!',
      groups: [{ label: 'Calma (0)' }, { label: 'Brisa (2–4)' }, { label: 'Viento fuerte (6–8)' }, { label: 'Temporal (9 o más)' }],
      items: [
        { label: 'El humo de la fogata sube recto' }, { label: 'El estanque está liso como un espejo' },
        { label: 'Las hojas susurran; lo sientes en la cara' }, { label: 'Las ramitas no paran de moverse; las banderas ondean' }, { label: 'Los papeles sueltos salen volando' },
        { label: 'Cuesta sujetar el paraguas' }, { label: 'Se mueven árboles enteros' }, { label: 'Se rompen ramitas de los árboles' },
        { label: 'Salen volando tejas del tejado' }, { label: 'Árboles arrancados de raíz' }
      ]
    },
    quiz: [
      { q: '¿Qué es el viento?', choices: ['Aire en movimiento', 'Agua en el cielo', 'Luz del Sol'], hint: 'No lo podemos ver, pero sí sentir.', explain: 'El viento es aire que se mueve de un lugar a otro.' },
      { q: '¿Hacia dónde apunta la flecha de una veleta?', choices: ['Siempre al norte', 'Hacia el viento, hacia donde viene', 'Hacia el suelo'], hint: 'Los vientos llevan el nombre del lugar de donde vienen.', explain: 'La flecha de una veleta apunta hacia el viento, hacia donde viene.' },
      { q: '¿Quién creó una escala del viento del 0 al 12 en 1805?', choices: ['Luke Howard', 'Isaac Newton', 'Francis Beaufort'], hint: 'Era oficial de la marina.', explain: 'Francis Beaufort creó su escala del viento en 1805, y los marineros todavía la usan.' },
      { q: 'En un día de sol en la playa, la brisa fresca suele soplar…', choices: ['Del mar hacia la tierra', 'De la tierra hacia el mar', 'Hacia abajo'], hint: 'La tierra se calienta más rápido, y el aire caliente sube.', explain: 'El aire caliente sube sobre la tierra y el aire más fresco llega desde el mar: es la brisa marina.' },
      { q: 'En la escala de Beaufort, ¿qué quiere decir 0?', choices: ['Un huracán', 'Una brisa suave', 'Calma: el humo sube recto'], hint: 'El número más pequeño…', explain: '0 quiere decir calma: el aire está quieto y el humo sube recto.' }
    ]
  },

  // ── Anillo 5: Altos del Nido ──
  'earth5-forest-weather-station': {
    title: 'La estación meteorológica', topicName: 'Medir el tiempo', blurb: 'Termómetros, pluviómetros, veletas y anemómetros: mide el tiempo como una científica.',
    reading: [
      { title: 'Medir, no adivinar', text: 'Los científicos del tiempo miden el tiempo con instrumentos, a las mismas horas cada día. Así pueden comparar de forma justa días, lugares y años.' },
      { title: 'Temperatura y lluvia', text: 'Un termómetro mide lo caliente o lo frío que está el aire, en grados Celsius (°C). Un pluviómetro recoge la lluvia, y medimos la profundidad del agua en milímetros.' },
      { title: 'Viento', text: 'Una veleta muestra la dirección del viento. Un anemómetro, con unas cazoletas que giran, mide su velocidad: cuanto más rápido giran las cazoletas, más fuerte es el viento.' },
      { title: 'Medidas justas', text: 'El termómetro va a la sombra, bastante por encima del suelo, para que el sol no lo engañe. El pluviómetro va al aire libre, lejos de árboles y tejados.' }
    ],
    dialogue: {
      npc: { name: 'Hana, meteoróloga', role: 'una científica del tiempo en la estación meteorológica del bosque' },
      intro: '¡Bienvenida, bienvenido a mi estación meteorológica! Soy Hana. Cada mañana a las nueve leo todos mis instrumentos y anoto los números. ¿Me ayudas?',
      topics: [
        { ask: '¿Por qué mides a la misma hora cada día?', answer: 'Para que los números se puedan comparar de forma justa. Al mediodía el aire está más caliente que al amanecer, así que si midiera a horas distintas, ¡me estaría engañando a mí misma!' },
        { ask: '¿Por qué el termómetro está en una caja blanca?', answer: 'La caja le tapa el sol, pero deja pasar el aire por sus lados de listones. La pintura blanca refleja la luz del sol. Así mido el aire, no el sol.' },
        { ask: '¿Quién midió la lluvia primero?', answer: 'La gente mide la lluvia desde hace más de 2000 años. En 1441, en Corea, en la corte del rey Sejong se enviaron pluviómetros del mismo tamaño a todo el reino, para poder comparar de forma justa la lluvia de cada pueblo.' },
        { ask: '¿Qué es un anemómetro?', answer: '¡Un medidor de la velocidad del viento! Sus cazoletas atrapan el viento y giran. Un contador convierte las vueltas en una velocidad, como 15 kilómetros por hora.' }
      ],
      challenge: { q: '¿Qué instrumento mide cuánta lluvia cayó?', choices: ['Un termómetro', 'Una veleta', 'Un pluviómetro'], explain: 'Un pluviómetro recoge la lluvia, y medimos la profundidad del agua.' },
      farewell: '¡Gracias, ayudante del tiempo! Escribe tus números con buena letra: puede que los lean científicos del futuro.'
    },
    sort: {
      q: '¿Qué instrumento dio cada medida? ¡Ordena la libreta de Hana!',
      groups: [{ label: 'Termómetro' }, { label: 'Pluviómetro' }, { label: 'Veleta' }, { label: 'Anemómetro' }],
      items: [
        { label: '18 °C a la sombra' }, { label: '−3 °C una mañana de escarcha' },
        { label: '12 mm de lluvia desde ayer' }, { label: '0 mm: un día seco' },
        { label: 'Viento del noroeste' }, { label: 'Viento del sur' },
        { label: 'Velocidad del viento: 25 km/h' },
        { label: 'Velocidad del viento: 0 km/h, calma', hint: 'La velocidad la miden las cazoletas que giran.' }
      ]
    },
    timeline: {
      title: 'Aprender a medir el tiempo',
      events: [
        { label: 'Se envían pluviómetros del mismo tamaño por toda Corea', when: '1441' },
        { label: 'Daniel Fahrenheit fabrica un termómetro de mercurio', when: '1714' },
        { label: 'Anders Celsius propone su escala de temperatura', when: '1742' },
        { label: 'Francis Beaufort escribe su escala del viento', when: '1805' },
        { label: 'Los primeros pronósticos del tiempo de Robert FitzRoy salen en un periódico', when: '1861' }
      ]
    },
    quiz: [
      { q: '¿Qué mide un termómetro?', choices: ['La temperatura', 'La lluvia', 'La velocidad del viento'], hint: 'Caliente o frío…', explain: 'Un termómetro mide la temperatura, en grados Celsius.' },
      { q: '¿Por qué el termómetro se pone a la sombra?', choices: ['Para que no se sienta solo', 'Para que el sol no lo engañe', 'Para que esté mojado'], hint: 'Queremos la temperatura del aire.', explain: 'Al sol, un termómetro se calienta más que el aire, así que marcaría demasiado.' },
      { q: '¿Qué mide un anemómetro?', choices: ['La dirección del viento', 'La lluvia', 'La velocidad del viento'], hint: 'Sus cazoletas giran.', explain: 'Un anemómetro mide la velocidad del viento: cuanto más rápido giran sus cazoletas, más fuerte es el viento.' },
      { q: '¿Dónde debe ponerse un pluviómetro?', choices: ['Al aire libre, lejos de árboles y tejados', 'Debajo de un árbol', 'Dentro de casa'], hint: 'Nada debe tapar la lluvia.', explain: 'Al aire libre, nada impide que la lluvia caiga dentro, ni le gotea lluvia de más.' },
      { q: 'En 1441, ¿qué envió la corte real de Corea por todo el reino?', choices: ['Termómetros', 'Pluviómetros del mismo tamaño', 'Globos meteorológicos'], hint: 'Mira tu línea del tiempo.', explain: 'Pluviómetros del mismo tamaño, para poder comparar de forma justa la lluvia de cada pueblo.' }
    ]
  },
  'earth5-forest-rock-cycle': {
    title: 'Las rocas y el ciclo de las rocas', topicName: 'Tipos de roca y el ciclo de las rocas', blurb: 'Ígneas, sedimentarias y metamórficas: aprende a leer la historia de una roca.',
    reading: [
      { title: 'Tres familias de rocas', text: 'Los geólogos clasifican las rocas en tres familias según cómo se formaron: ígneas, sedimentarias y metamórficas.' },
      { title: 'Ígneas: nacidas del fuego', text: 'Las rocas ígneas se forman cuando la roca caliente y fundida se enfría y se endurece. El granito se enfrió despacio en lo profundo de la tierra; el basalto se enfrió rápido en la superficie.' },
      { title: 'Sedimentarias: capa sobre capa', text: 'La arena, el barro y las conchas se depositan en capas. Con muchísimo tiempo, las capas se aprietan y se pegan hasta formar rocas como la arenisca y la caliza. Ahí es donde se encuentran los fósiles.' },
      { title: 'Metamórficas: cambiadas', text: 'El calor y la presión en lo profundo de la tierra pueden cambiar una roca sin fundirla: la caliza se convierte en mármol y la lutita en pizarra. Las rocas no dejan de pasar de una familia a otra en el ciclo de las rocas.' }
    ],
    dialogue: {
      npc: { name: 'Ines, geóloga', role: 'una geóloga con un martillo de roca' },
      intro: '¡Hola! Soy Ines y soy geóloga: estudio las rocas. Cada roca tiene una historia, ¡y te voy a enseñar a leerla!',
      topics: [
        { ask: '¿Cómo reconozco una roca ígnea?', answer: 'Busca cristales encajados como un rompecabezas: eso es granito. O una roca oscura, a veces con agujeritos que dejaron burbujas de gas: eso suele ser basalto.' },
        { ask: '¿Por qué las rocas sedimentarias tienen rayas?', answer: 'Cada raya es una capa que se depositó en un momento distinto: quizá una riada de arena y luego barro tranquilo. Las capas también pueden guardar fósiles.' },
        { ask: '¿De verdad el mármol está hecho de caliza?', answer: '¡Sí! En lo profundo de la tierra, el calor y la presión aprietan la caliza hasta que sus trocitos crecen y se vuelven cristales brillantes. Muchas estatuas y palacios están hechos de mármol.' },
        { ask: '¿De verdad cambian las rocas?', answer: 'Muy, muy despacio. Una montaña se desgasta hasta volverse arena, la arena se convierte en arenisca, el calor de lo profundo la transforma en una roca nueva, y algún día puede que vuelva a subir. Esa vuelta sin fin es el ciclo de las rocas.' }
      ],
      challenge: { q: '¿Qué familia de rocas se forma cuando la roca fundida se enfría?', choices: ['Sedimentaria', 'Ígnea', 'Metamórfica'], explain: 'Las rocas ígneas se forman cuando la roca fundida se enfría y se endurece.' },
      farewell: 'La próxima vez que recojas una piedrita, ¡pregúntale dónde ha estado!'
    },
    artifact: { name: 'La lupa de una geóloga', text: 'Los geólogos llevan una lupa pequeña, muchas veces colgada del cuello con un cordón. Si la acercas a una roca, muestra sus granos y sus cristales: granos redondeados pegados entre sí indican una roca sedimentaria, y cristales afilados encajados como un rompecabezas suelen indicar una ígnea.' },
    sort: {
      q: '¡Ayuda a Ines a ordenar su colección de rocas en las tres familias!',
      groups: [{ label: 'Ígneas' }, { label: 'Sedimentarias' }, { label: 'Metamórficas' }],
      items: [
        { label: 'Granito: cristales moteados' }, { label: 'Basalto: oscuro, de lava' },
        { label: 'Piedra pómez: ¡tan ligera que flota!', hint: 'La piedra pómez es lava llena de burbujas de gas que se enfrió muy rápido.' },
        { label: 'Arenisca: granos ásperos' }, { label: 'Caliza con conchitas' }, { label: 'Creta: esqueletos de diminutos seres marinos' },
        { label: 'Mármol, hecho de caliza' },
        { label: 'Pizarra: se parte en láminas finas', hint: 'La pizarra era lutita, cambiada por el calor y la presión.' },
        { label: 'Cuarcita, hecha de arenisca' }
      ]
    },
    quiz: [
      { q: '¿Qué familia de rocas se forma en capas de arena y barro?', choices: ['Ígnea', 'Metamórfica', 'Sedimentaria'], hint: 'Capa sobre capa…', explain: 'Las rocas sedimentarias se forman con capas de arena, barro y conchas.' },
      { q: '¿En qué se convierte la caliza con calor y presión?', choices: ['En mármol', 'En granito', 'En arena'], hint: 'Muchas estatuas están hechas de ella.', explain: 'El calor y la presión convierten la caliza en mármol, una roca metamórfica.' },
      { q: '¿Qué roca puede flotar en el agua?', choices: ['El granito', 'La piedra pómez', 'El mármol'], hint: 'Está llena de burbujas.', explain: 'La piedra pómez tiene tantas burbujas de gas que flota.' },
      { q: '¿En qué familia de rocas solemos encontrar fósiles?', choices: ['Sedimentaria', 'Ígnea', 'En ninguna'], hint: 'Los fósiles quedan enterrados en barro y arena.', explain: 'Los fósiles se encuentran en rocas sedimentarias, hechas del barro y la arena que enterraron a los seres vivos.' },
      { q: '¿Qué es el ciclo de las rocas?', choices: ['Una bici hecha de piedra', 'Rocas que ruedan cuesta abajo una vez', 'Rocas que pasan despacio de una familia a otra, una y otra vez'], hint: 'Una vuelta sin fin…', explain: 'En el ciclo de las rocas, las rocas pasan despacio de una familia a otra, una y otra vez.' }
    ]
  },

  // ── Anillo 6: Anillos de Girasol ──
  'earth6-forest-inside-earth': {
    title: 'Dentro de la Tierra: capas y placas que se mueven', topicName: 'Las capas de la Tierra y las placas', blurb: 'Corteza, manto y núcleo, y las placas gigantes que se mueven despacio bajo nuestros pies.',
    reading: [
      { title: 'Como un melocotón', text: 'La Tierra tiene capas. La fina corteza de fuera es como la piel de un melocotón. Debajo está el manto, roca caliente que fluye muy despacio. En el centro está el núcleo, hecho sobre todo de hierro y níquel.' },
      { title: 'Dos núcleos', text: 'El núcleo externo es metal líquido. En 1936, la científica danesa Inge Lehmann estudió las ondas de los terremotos y demostró que dentro de él hay un núcleo interno sólido.' },
      { title: 'Placas que se mueven', text: 'La corteza está partida en piezas gigantes llamadas placas tectónicas. Se mueven unos pocos centímetros al año, más o menos lo que te crecen las uñas.' },
      { title: 'Donde se juntan las placas', text: 'Donde las placas chocan, se elevan muy despacio montañas como el Himalaya. Donde se rozan al pasar una junto a otra o se separan, los terremotos sacuden el suelo.' }
    ],
    dialogue: {
      npc: { name: 'Inge Lehmann, que descubrió el núcleo interno', role: 'sismóloga danesa (1888–1993)' },
      intro: '¡Hola! Me llamo Inge Lehmann. Nadie puede cavar hasta el centro de la Tierra, así que encontré una manera más ingeniosa de mirar dentro: estudié los terremotos.',
      topics: [
        { ask: '¿Cómo pueden los terremotos mostrar lo que hay dentro de la Tierra?', answer: 'Un terremoto manda ondas a través de todo el planeta. Se doblan y rebotan cuando pasan de una capa a otra. Si medimos cuándo llegan a estaciones lejanas, podemos averiguar por dónde viajaron.' },
        { ask: '¿Qué descubriste?', answer: 'Algunas ondas llegaban a lugares adonde no deberían llegar si todo el núcleo fuera líquido. En 1936 lo expliqué: tiene que haber un núcleo interno sólido dentro del núcleo externo líquido.' },
        { ask: '¿La gente te creyó?', answer: 'Otros científicos comprobaron mi idea con más terremotos, y las pruebas fueron creciendo. Hoy todos los libros de texto muestran el núcleo interno.' },
        { ask: '¿El centro de la Tierra está caliente?', answer: '¡Muchísimo! El núcleo interno está más o menos tan caliente como la superficie del Sol. Solo sigue siendo sólido porque allí la presión es enorme.' }
      ],
      challenge: { q: '¿Cómo descubrió Inge Lehmann el núcleo interno?', choices: ['Cavando un hoyo muy profundo', 'Estudiando las ondas de los terremotos', 'Mirando por un telescopio'], explain: 'Midió cuándo llegaban las ondas de los terremotos a estaciones lejanas y averiguó por dónde habían pasado.' },
      farewell: 'Sigue preguntando cómo sabemos lo que sabemos: ¡eso es lo que hacen los científicos!'
    },
    sort: {
      q: '¿De qué capa de la Tierra habla cada tarjeta?',
      groups: [{ label: 'Corteza' }, { label: 'Manto' }, { label: 'Núcleo externo' }, { label: 'Núcleo interno' }],
      items: [
        { label: 'Donde vivimos' }, { label: 'La capa más fina, partida en placas' },
        { label: 'Roca caliente que fluye muy despacio' },
        { label: 'La capa más gruesa', hint: 'Tiene casi 3000 km de grosor.' },
        { label: 'Hierro y níquel líquidos' },
        { label: 'Se arremolina y crea el campo magnético de la Tierra', hint: 'El metal líquido en movimiento crea el campo magnético que mueve la aguja de una brújula.' },
        { label: 'Una bola de metal sólido justo en el centro' }, { label: 'La descubrió Inge Lehmann en 1936' }
      ]
    },
    timeline: {
      title: 'Descubrir lo que hay bajo nuestros pies',
      events: [
        { label: 'Alfred Wegener propone que los continentes se desplazan', when: '1912' },
        { label: 'Charles Richter crea su escala de terremotos', when: '1935' },
        { label: 'Inge Lehmann demuestra que la Tierra tiene un núcleo interno sólido', when: '1936' },
        { label: 'Los científicos se ponen de acuerdo: la corteza está hecha de placas que se mueven', when: 'finales de los años sesenta' },
        { label: 'El agujero más profundo jamás perforado llega a unos 12 km', when: '1989' }
      ]
    },
    quiz: [
      { q: '¿Cómo se llama la fina capa exterior de la Tierra?', choices: ['El núcleo', 'La corteza', 'El manto'], hint: 'Como la piel de un melocotón…', explain: 'La corteza es la fina capa exterior, donde vivimos.' },
      { q: '¿Cómo es el núcleo externo?', choices: ['Metal líquido', 'Hielo sólido', 'Espacio vacío'], hint: 'Hierro y níquel, muy calientes…', explain: 'El núcleo externo es hierro y níquel líquidos.' },
      { q: '¿Más o menos a qué velocidad se mueven las placas tectónicas?', choices: ['Unos metros al día', 'No se mueven nunca', 'Unos pocos centímetros al año'], hint: 'Más o menos lo que te crecen las uñas.', explain: 'Las placas se mueven unos pocos centímetros al año.' },
      { q: '¿Qué puede pasar donde dos placas chocan?', choices: ['Se elevan montañas poco a poco', 'El mar hierve', 'La Luna se acerca'], hint: 'Piensa en el Himalaya.', explain: 'Donde las placas chocan, la corteza se arruga y forma montañas, muy despacio.' },
      { q: '¿Qué pista hizo pensar a Alfred Wegener que los continentes se habían movido?', choices: ['Los vio moverse', 'Las costas de Sudamérica y África encajan como piezas de un rompecabezas', 'Un mapa en una cueva'], hint: 'Mira un globo terráqueo.', explain: 'Las costas de Sudamérica y África encajan, y a los dos lados se encuentran fósiles y rocas iguales.' }
    ]
  },
  'earth6-forest-forecast': {
    title: 'Mapas del tiempo y pronósticos', topicName: 'Mapas del tiempo y pronósticos', blurb: 'Altas, bajas y frentes: lee un mapa del tiempo como quien da el pronóstico.',
    reading: [
      { title: 'Altas y bajas', text: 'Los mapas del tiempo muestran zonas de alta y de baja presión. Una alta (anticiclón) suele traer tiempo tranquilo, seco y estable. Una baja (borrasca) suele traer nubes, viento y lluvia.' },
      { title: 'Frentes', text: 'Un frente es el borde entre una masa de aire caliente y una masa de aire frío. En los mapas del tiempo, el frente frío se dibuja con triángulos azules, y el frente cálido con semicírculos rojos.' },
      { title: 'Frente frío, frente cálido', text: 'Un frente frío se mete por debajo del aire caliente y lo empuja hacia arriba rápido: chubascos fuertes, quizá truenos, y luego aire más fresco y despejado. Un frente cálido sube despacio por encima del aire frío y trae lluvia larga y constante.' },
      { title: 'Cómo se hacen los pronósticos', text: 'Los meteorólogos reúnen millones de medidas de estaciones meteorológicas, globos, barcos y satélites. Las supercomputadoras las usan para calcular qué hará el aire después.' }
    ],
    dialogue: {
      npc: { name: 'Sunny Park, la del tiempo', role: 'presentadora del tiempo en la tele' },
      intro: 'Buenas noches, ¡y aquí está el tiempo! Ja, ja, ¡hola! Soy Sunny, y le cuento a todo el mundo qué tiempo hará mañana. Te enseño mi mapa.',
      topics: [
        { ask: '¿Qué quieren decir la A y la B?', answer: 'La A es de alta presión: el aire baja despacio, así que a las nubes les cuesta formarse. Espera tiempo tranquilo y seco. La B es de baja presión: el aire sube, se enfría y forma nubes, viento y lluvia.' },
        { ask: '¿Qué son las líneas con triángulos?', answer: '¡Es un frente frío! Los triángulos azules señalan hacia dónde se mueve. Cuando pasa, espera un chaparrón fuerte, y luego un día más fresco y más luminoso.' },
        { ask: '¿El pronóstico siempre acierta?', answer: '¡No siempre! El pronóstico para mañana suele ser muy bueno, pero uno para dentro de diez días es mucho más difícil, porque los cambios diminutos en el aire pueden volverse grandes.' },
        { ask: '¿Qué son las líneas curvas de tu mapa?', answer: '¡Las isobaras! Unen los lugares que tienen la misma presión del aire. Cuando están muy apretadas, va a hacer mucho viento.' }
      ],
      challenge: { q: 'En un mapa del tiempo, ¿qué suele traer una alta (A)?', choices: ['Tormentas', 'Nieve siempre', 'Tiempo tranquilo y seco'], explain: 'En una alta, el aire baja y a las nubes les cuesta formarse, así que el tiempo suele ser tranquilo y seco.' },
      farewell: 'Esto es todo por mi parte. Que tengas un día precioso, ¡y llévate el paraguas si ves que viene una B!'
    },
    maphunt: {
      q: '¡Lee el mapa del tiempo de Sunny para mañana y responde cada pregunta tocando un lugar!',
      map: { regions: [{ label: 'El mar' }, { label: 'Las colinas del norte' }, { label: 'La costa oeste' }, { label: 'Las llanuras del este' }, { label: 'Las playas del sur' }] },
      clues: [
        { q: 'Aquí hay una alta: tranquilo, seco y soleado. ¿Dónde?', hint: 'Busca el sol despejado.' },
        { q: 'Un frente cálido trae lluvia larga y constante. ¿Dónde?', hint: 'Lluvia constante, no una tormenta.' },
        { q: '¡Está pasando un frente frío: truenos y chubascos fuertes! ¿Dónde?', hint: 'Busca la nube de tormenta.' },
        { q: 'Aquí el frente frío ya pasó: ahora hace más fresco y está más despejado. ¿Dónde debería ir el pícnic?', hint: 'El sol asoma después de la lluvia…' }
      ]
    },
    quiz: [
      { q: '¿Qué suele traer una B en un mapa del tiempo?', choices: ['Cielos azules y despejados', 'Nubes, viento y lluvia', 'Un terremoto'], hint: 'El aire sube y se enfría…', explain: 'En una baja, el aire que sube se enfría y forma nubes, viento y lluvia.' },
      { q: '¿Cómo se dibuja un frente frío?', choices: ['Una línea con triángulos azules', 'Una línea con semicírculos rojos', 'Un zigzag verde'], hint: 'El frío es azul…', explain: 'Un frente frío es una línea con triángulos azules que señalan hacia dónde se mueve.' },
      { q: 'Cuando las isobaras están muy apretadas, va a hacer…', choices: ['Mucha calma', 'Mucha niebla', 'Mucho viento'], hint: 'Sunny te lo contó.', explain: 'Isobaras muy juntas quieren decir que la presión cambia rápido en poca distancia, y eso causa vientos fuertes.' },
      { q: '¿Por qué los pronósticos a 10 días son menos fiables que el de mañana?', choices: ['Las computadoras se cansan', 'Los cambios pequeños en el aire crecen con el tiempo', 'El Sol se mueve más rápido'], hint: 'Cambios diminutos…', explain: 'Los cambios diminutos en el aire pueden volverse grandes, así que los pronósticos lejanos son más difíciles.' },
      { q: 'Un frente cálido suele traer…', choices: ['Lluvia larga y constante', 'Una granizada repentina y luego sol', 'Nada de nada'], hint: 'Sube despacio por encima del aire frío.', explain: 'Un frente cálido sube despacio por encima del aire frío y trae lluvia larga y constante.' }
    ]
  },

  // ── Anillo 7: Corona Estelar ──
  'earth7-forest-climate-zones': {
    title: 'Las zonas climáticas del mundo', topicName: 'El clima y las zonas climáticas', blurb: 'El tiempo es hoy; el clima es lo que se repite durante años. Explora las zonas del mundo y sus bosques.',
    reading: [
      { title: '¿Tiempo o clima?', text: 'El tiempo es lo que hace el aire hoy. El clima es el tiempo habitual de un lugar durante muchos años, unos 30. «Hoy llueve» es tiempo. «Aquí los veranos son calurosos y secos» es clima.' },
      { title: 'La luz del sol y la latitud', text: 'Cerca del ecuador, el Sol está alto en el cielo todo el año, así que hace calor. Hacia los polos, la luz del sol llega muy inclinada y se reparte por más suelo, así que hace más frío.' },
      { title: 'Las zonas principales', text: 'Las zonas tropicales son calurosas todo el año, y muchas veces húmedas. Las zonas secas reciben muy poca lluvia. Las zonas templadas tienen cuatro estaciones. Las zonas polares son frías todo el año.' },
      { title: 'Cada clima tiene su bosque', text: 'Las selvas tropicales crecen en los trópicos calurosos y húmedos. Los bosques de hoja ancha, de robles y hayas, crecen en las tierras templadas. La taiga, un cinturón de coníferas, rodea el norte frío. Donde hace demasiado frío o demasiada sequía, los árboles no pueden crecer.' }
    ],
    dialogue: {
      npc: { name: 'Dra. Amara Osei, climatóloga', role: 'una científica que estudia el clima' },
      intro: '¡Hola! Soy Amara y estudio el clima: cómo se repite el tiempo durante muchos años. ¡He trabajado en selvas, en desiertos y en el borde del Ártico!',
      topics: [
        { ask: '¿En qué se diferencian el tiempo y el clima?', answer: '¡El tiempo es tu humor de hoy; el clima es tu forma de ser! Un día de lluvia no cambia el clima de un desierto. Necesitamos unos 30 años de tiempo para conocer el clima de un lugar.' },
        { ask: '¿Por qué hace calor en el ecuador?', answer: 'La luz del sol llega al ecuador casi de frente, así que su energía se concentra en un área pequeña. Cerca de los polos, la misma luz llega inclinada y se reparte, como el haz de una linterna que inclinas de lado.' },
        { ask: '¿Qué es la taiga?', answer: '¡El cinturón de bosque más grande de la tierra firme! Pinos, píceas y alerces se extienden por Rusia, Escandinavia, Canadá y Alaska, con inviernos largos y helados y veranos cortos.' },
        { ask: '¿Por qué las selvas tropicales son tan húmedas?', answer: 'El sol fuerte cerca del ecuador hace subir aire cálido y húmedo casi todos los días. Se enfría, forma nubes altísimas y cae en forma de lluvia, muchas veces por la tarde.' }
      ],
      challenge: { q: '¿Qué es el clima?', choices: ['El tiempo de esta tarde', 'El tiempo habitual de un lugar durante muchos años', 'La velocidad del viento ahora mismo'], explain: 'El clima es lo que se repite en el tiempo durante muchos años, normalmente unos 30.' },
      farewell: 'Vivas donde vivas, mira a tu alrededor: ¡tu clima da forma a tus plantas, tus animales y hasta tus casas!'
    },
    maphunt: {
      q: '¡Encuentra las grandes zonas climáticas del mundo con Amara!',
      clues: [
        { q: 'La Amazonia, la selva tropical más grande, está en este continente.', hint: 'Está justo en el ecuador, en América.' },
        { q: 'El Sahara, el desierto cálido más grande, cubre gran parte del norte de este continente.', hint: 'Justo al sur de Europa.' },
        { q: 'Esta tierra cubierta de hielo en el polo sur tiene clima polar todo el año.', hint: 'Mira abajo del todo.' },
        { q: 'La mayor parte de la taiga se extiende por este continente, desde Rusia hasta el Pacífico.', hint: 'El continente más grande de todos.' },
        { q: 'En su norte hay bosques templados de robles y hayas, y en su sur, veranos mediterráneos calurosos y secos.', hint: 'Al norte de África, al oeste de Asia.' }
      ]
    },
    sort: {
      q: '¿Qué bosque o tierra describe cada tarjeta? ¡Ordena las tarjetas de Amara!',
      groups: [{ label: 'Selva tropical' }, { label: 'Bosque templado' }, { label: 'Taiga' }, { label: 'Tundra' }],
      items: [
        { label: 'Calor y lluvia todo el año' }, { label: 'Perezosos y tucanes' }, { label: 'Jaguares que cazan junto a los ríos' },
        { label: 'Cuatro estaciones bien marcadas' }, { label: 'Robles, arces y hayas' }, { label: 'Erizos y tejones' },
        { label: 'Inviernos largos y helados, veranos cortos' }, { label: 'Pinos, píceas y alerces' }, { label: 'Alces y linces' },
        { label: 'Demasiado frío para los árboles; suelo helado' }, { label: 'Musgos, líquenes y arbustos diminutos' },
        { label: 'Zorros árticos y caribúes', hint: 'Los zorros árticos viven donde hace demasiado frío para los bosques.' }
      ]
    },
    quiz: [
      { q: '¿Por qué hace calor en los lugares cerca del ecuador?', choices: ['Están más cerca de la Luna', 'El suelo está hecho de fuego', 'La luz del sol les llega casi de frente'], hint: 'Piensa en el haz de una linterna.', explain: 'Cerca del ecuador, la luz del sol llega casi de frente y concentra su energía en un área pequeña.' },
      { q: '¿Cuántos años de tiempo suelen usar los científicos para describir un clima?', choices: ['Unos 30', '1', 'Unos 1000'], hint: 'Amara te lo contó.', explain: 'El clima se calcula normalmente con unos 30 años de tiempo.' },
      { q: '¿Cuál es el cinturón de bosque más grande de la tierra firme?', choices: ['Un bosque templado de robles', 'La taiga', 'Un parque de la ciudad'], hint: 'Coníferas por todo el norte frío…', explain: 'La taiga, el bosque frío de coníferas del norte, es el cinturón de bosque más grande de la tierra firme.' },
      { q: '¿En qué zona climática hay cuatro estaciones bien marcadas?', choices: ['Tropical', 'Polar', 'Templada'], hint: 'Como las del Gran Árbol.', explain: 'Las zonas templadas tienen primavera, verano, otoño e invierno.' },
      { q: 'En un desierto llueve mucho durante una semana. ¿Qué nos dice eso?', choices: ['El tiempo fue lluvioso, pero el clima sigue siendo seco', 'Ahora el desierto tiene clima de selva tropical', 'El clima y el tiempo son lo mismo'], hint: 'El tiempo es hoy; el clima son muchos años.', explain: 'Una semana de lluvia es tiempo. El clima del desierto, su tiempo habitual durante muchos años, sigue siendo seco.' }
    ]
  },
  'earth7-forest-forests-climate': {
    title: 'Cómo los bosques enfrían el planeta', topicName: 'Los bosques y el clima', blurb: 'El efecto invernadero, el carbono que guardan los árboles y la lluvia que ayudan a formar.',
    reading: [
      { title: 'El efecto invernadero', text: 'Algunos gases del aire, como el dióxido de carbono (CO₂) y el vapor de agua, atrapan el calor cerca de la Tierra como una manta. Sin ellos, la Tierra estaría congelada. Con demasiados, se calienta demasiado.' },
      { title: 'Los árboles guardan carbono', text: 'Los árboles toman CO₂ del aire para construir su madera, sus hojas y sus raíces. Un árbol grande y viejo guarda toneladas de carbono. Quemar o talar los bosques devuelve mucho de ese carbono al aire.' },
      { title: 'Los árboles hacen lluvia', text: 'Un árbol grande puede sacar cientos de litros de agua del suelo en un día y soltarla por sus hojas. Sobre la Amazonia, esa agua forma «ríos voladores» de aire húmedo que llevan lluvia a lugares muy lejanos.' },
      { title: 'Sombra y frescor', text: 'El agua que se evapora enfría el aire, igual que el sudor enfría tu piel. En un día caluroso, las calles con árboles pueden estar varios grados más frescas que las calles sin ellos.' }
    ],
    dialogue: {
      npc: { name: 'Eunice Foote, que puso a prueba los gases que calientan', role: 'científica e inventora estadounidense (1819–1888)' },
      intro: '¡Buenos días! Soy Eunice Foote. En 1856 hice un experimento con cilindros de vidrio y luz del sol, y descubrí algo que hoy importa muchísimo.',
      topics: [
        { ask: '¿Cuál fue tu experimento?', answer: 'Llené cilindros de vidrio con distintos gases, puse un termómetro en cada uno y los dejé al sol. El que estaba lleno de dióxido de carbono se calentó más que todos, y fue el que más tardó en enfriarse cuando lo saqué del sol.' },
        { ask: '¿Qué pensaste que quería decir?', answer: 'Escribí que, si el aire tuviera más de ese gas, la Tierra estaría más caliente. Hoy sabemos que tenía razón: es parte del efecto invernadero.' },
        { ask: '¿Por qué probaste gases distintos?', answer: 'Una buena científica cambia una sola cosa cada vez. Los mismos cilindros, el mismo sol, los mismos termómetros: solo el gas era distinto. ¡Así que el gas tenía que explicar la diferencia!' },
        { ask: '¿La gente te hizo caso?', answer: 'Mi artículo se leyó en voz alta en una gran reunión científica en 1856, y lo leyó un hombre, Joseph Henry, como era costumbre entonces. Durante mucho tiempo mi trabajo quedó olvidado, pero la gente lo redescubrió en la década de 2010.' }
      ],
      challenge: { q: 'En el experimento de Eunice Foote, ¿qué cilindro se calentó más al sol?', choices: ['El que estaba a la sombra', 'El que tenía dióxido de carbono', 'El que tenía aire normal'], explain: 'El cilindro lleno de dióxido de carbono se calentó más y fue el que más tardó en enfriarse.' },
      farewell: '¡Sigue poniendo a prueba tus ideas con cuidado, un cambio cada vez!'
    },
    timeline: {
      title: 'Aprender cómo funciona el clima',
      events: [
        { label: 'Eunice Foote muestra que el dióxido de carbono atrapa el calor del Sol', when: '1856' },
        { label: 'Svante Arrhenius calcula cuánto más caliente estaría la Tierra con más CO₂', when: '1896' },
        { label: 'Charles Keeling empieza a medir el CO₂ del aire en un volcán de Hawái', when: '1958' },
        { label: 'Wangari Maathai inicia el Movimiento Cinturón Verde, plantando árboles en Kenia', when: '1977' },
        { label: 'Casi todos los países firman el Acuerdo de París para limitar el calentamiento', when: '2015' }
      ]
    },
    artifact: { name: 'Una rodaja de tronco', text: 'Cada anillo es un año de crecimiento. Los anillos anchos indican buenos años para crecer, muchas veces cálidos y húmedos; los anillos estrechos indican años difíciles, como las sequías. Estudiando los anillos de árboles muy viejos y de madera antigua, los científicos pueden leer el clima de hace cientos, y hasta miles, de años. Y toda esa madera es carbono que se sacó del aire.' },
    quiz: [
      { q: '¿Qué hace el efecto invernadero?', choices: ['Atrapa el calor cerca de la Tierra', 'Hace que las plantas crezcan solo en invernaderos', 'Enfría el Sol'], hint: 'Como una manta…', explain: 'Gases como el CO₂ y el vapor de agua atrapan el calor cerca de la Tierra, como una manta.' },
      { q: '¿De dónde saca un árbol el carbono para construir su madera?', choices: ['De las rocas', 'Del CO₂ del aire', 'Del agua de lluvia'], hint: 'Lo toma por sus hojas.', explain: 'Los árboles toman CO₂ del aire y usan su carbono para construir madera, hojas y raíces.' },
      { q: '¿Qué son los «ríos voladores» de la Amazonia?', choices: ['Ríos que saltan', 'Bandadas de pájaros', 'Aire húmedo de los árboles que lleva lluvia muy lejos'], hint: 'Los árboles sueltan agua por sus hojas.', explain: 'El agua de millones de árboles sube como aire húmedo y viaja muy lejos, hasta caer como lluvia en otro lugar.' },
      { q: '¿Por qué Eunice Foote cambió solo el gas en su experimento?', choices: ['Para que el gas fuera lo único que pudiera explicar la diferencia', 'Porque solo tenía un termómetro', 'Para que fuera más rápido'], hint: 'Una prueba justa…', explain: 'Cambiar una sola cosa cada vez hace que la prueba sea justa: solo el gas podía explicar la diferencia.' },
      { q: '¿Qué suele mostrar un anillo de árbol estrecho?', choices: ['Un año muy bueno', 'Un año difícil, como una sequía', 'Que el árbol estaba dormido'], hint: 'Los anillos anchos son años buenos…', explain: 'Los anillos estrechos indican que el árbol creció poco ese año, muchas veces por la sequía o el frío.' }
    ]
  },

  // ───────── Laboratorio de la Naturaleza (Biología, Doctor Croac) ─────────
  // ── Anillo 1: Hueco de las Raíces ──
  'biology1-forest-plant-parts': {
    title: 'Raíces, tallos, hojas y flores', topicName: 'Las partes de una planta', blurb: 'Qué hace cada parte de una planta, ¡y qué partes nos comemos!',
    reading: [
      { title: 'Raíces', text: 'Las raíces sujetan la planta al suelo y beben el agua de la tierra. Algunas plantas guardan comida en raíces gruesas, como las zanahorias.' },
      { title: 'Tallos', text: 'El tallo sostiene la planta. Lleva el agua desde las raíces hasta las hojas, como una pajita.' },
      { title: 'Hojas', text: 'Las hojas atrapan la luz del sol y la usan para fabricar comida para la planta.' },
      { title: 'Flores y semillas', text: 'Las flores hacen semillas, y de las semillas pueden crecer plantas nuevas.' }
    ],
    sort: {
      q: '¡Comemos muchas partes de las plantas! Ayuda al Doctor Croac a ordenar la comida según la parte de la planta que es.',
      groups: [{ label: 'Raíces' }, { label: 'Hojas' }, { label: 'Flores' }, { label: 'Semillas' }],
      items: [
        { label: 'Zanahoria' }, { label: 'Batata' }, { label: 'Lechuga' }, { label: 'Espinaca' },
        { label: 'Brócoli', hint: '¡Esas bolitas verdes son botones de flor!' },
        { label: 'Alcachofa', hint: 'Una alcachofa es un gran botón de flor que se recoge antes de que se abra.' },
        { label: 'Maíz' }, { label: 'Frijoles' }, { label: 'Arroz' }
      ]
    },
    quiz: [
      { q: '¿Qué parte de la planta bebe el agua de la tierra?', choices: ['Las flores', 'Las raíces', 'Las hojas'], hint: 'Está debajo de la tierra.', explain: 'Las raíces beben el agua de la tierra.' },
      { q: '¿Qué hace el tallo?', choices: ['Hace semillas', 'Atrapa insectos', 'Sostiene la planta y lleva el agua'], hint: 'Como una pajita…', explain: 'El tallo sostiene la planta y lleva el agua desde las raíces hasta las hojas.' },
      { q: '¿Qué parte hace las semillas?', choices: ['La flor', 'La raíz', 'El tallo'], hint: 'Muchas veces es de colores y bonita.', explain: 'Las flores hacen las semillas.' },
      { q: '¿Qué parte de la planta es la zanahoria?', choices: ['Una hoja', 'Una flor', 'Una raíz'], hint: 'Crece debajo de la tierra.', explain: 'La zanahoria es una raíz gruesa, llena de comida guardada.' },
      { q: '¿Qué atrapan las hojas para fabricar comida?', choices: ['La luz del sol', 'Las nubes de lluvia', 'Gusanos'], hint: 'Viene del cielo en un día luminoso.', explain: 'Las hojas atrapan la luz del sol para fabricar comida para la planta.' }
    ]
  },
  'biology1-forest-living': {
    title: '¿Vivo o no vivo?', topicName: 'Seres vivos y cosas no vivas', blurb: '¿Vivo, estuvo vivo o nunca estuvo vivo? El Doctor Croac tiene un acertijo para ti.',
    reading: [
      { title: 'Los seres vivos', text: 'Los seres vivos crecen, necesitan comida y agua, respiran y tienen crías o hijos parecidos a ellos. ¡Las plantas, los animales y los hongos están vivos!' },
      { title: 'Nunca estuvo vivo', text: 'Una roca, una gota de lluvia y una llave de metal nunca han estado vivas. No comen, no crecen y no tienen crías.' },
      { title: 'Estuvo vivo', text: 'Algunas cosas estuvieron vivas una vez: una hoja caída, una pluma, una silla de madera. Vienen de seres vivos, pero ahora no están vivas.' },
      { title: 'Las semillas engañan', text: 'Una semilla parece una piedrita, ¡pero está viva! Está descansando. Dale agua y calor, y se despertará y crecerá.' }
    ],
    sort: {
      q: 'El Doctor Croac hizo tres montones. ¿Adivinas por qué?',
      groups: [{ label: 'Vivo' }, { label: 'Estuvo vivo' }, { label: 'Nunca estuvo vivo' }],
      items: [
        { label: 'Rana' }, { label: 'Pluma' }, { label: 'Piedrita' }, { label: 'Roble' },
        { label: 'Hongo', hint: 'Un hongo como este es parte de un ser vivo.' },
        { label: 'Bellota', hint: '¡Una semilla está viva, solo está descansando!' },
        { label: 'Hoja caída' },
        { label: 'Silla de madera', hint: 'La madera viene de los árboles.' },
        { label: 'Concha vacía de caracol' }, { label: 'Gota de lluvia' }, { label: 'Canica de vidrio' }, { label: 'Llave de metal' }
      ],
      rule: { q: '¿Cómo ordenó el Doctor Croac la rana, la pluma y la piedrita?', choices: ['Por color', 'Vivo, estuvo vivo, nunca estuvo vivo', 'Grande, mediano y pequeño'], hint: 'La rana salta. La pluma vino de un pájaro. ¿Y la piedrita…?', explain: 'La rana está viva, la pluma vino de un pájaro vivo y la piedrita nunca estuvo viva.' }
    },
    quiz: [
      { q: '¿Cuál de estos está vivo?', choices: ['Una piedrita', 'Una gota de lluvia', 'Un hongo'], hint: '¿Cuál crece?', explain: 'Un hongo es un ser vivo.' },
      { q: 'Una silla de madera se hizo con un árbol. La silla…', choices: ['Estuvo viva', 'Está viva', 'Nunca estuvo viva'], hint: '¿Estaba vivo el árbol? ¿La silla crece?', explain: 'La madera vino de un árbol vivo, pero la silla ahora no está viva: estuvo viva.' },
      { q: '¿Qué hacen todos los seres vivos?', choices: ['Volar', 'Crecer', 'Nadar'], hint: 'Un árbol, una rana y tú lo hacen.', explain: 'Todos los seres vivos crecen. No todos vuelan ni nadan.' },
      { q: '¿Una semilla está viva?', choices: ['No, es una piedra diminuta', 'Sí, está descansando hasta que pueda crecer'], hint: '¿Qué pasa cuando la riegas?', explain: 'Una semilla está viva. Con agua y calor, se despierta y crece.' },
      { q: '¿Qué nunca ha estado vivo?', choices: ['Una llave de metal', 'Una pluma', 'Una hoja de roble'], hint: '¿Cuál no vino de un ser vivo?', explain: 'Una llave de metal nunca estuvo viva. Las plumas y las hojas vienen de seres vivos.' }
    ]
  },

  // ── Anillo 2: Ramas de Helecho ──
  'biology2-forest-animal-groups': {
    title: 'Pelo, plumas, escamas y piel húmeda', topicName: 'Grupos de animales', blurb: 'Mamíferos, aves, reptiles y anfibios: ordena los animales del bosque en sus grupos.',
    reading: [
      { title: 'Animales con columna vertebral', text: 'Los animales que tienen columna vertebral se llaman vertebrados. Los científicos los ordenan en grupos: mamíferos, aves, reptiles, anfibios y peces.' },
      { title: 'Mamíferos y aves', text: 'Los mamíferos tienen pelo y alimentan a sus crías con leche. Las aves tienen plumas y ponen huevos de cáscara dura. Todas las aves tienen plumas, incluso las que no pueden volar.' },
      { title: 'Reptiles', text: 'Los reptiles tienen la piel seca y con escamas. La mayoría ponen en tierra huevos de cáscara blanda, como de cuero. Las serpientes, los lagartos, las tortugas y los cocodrilos son reptiles.' },
      { title: 'Anfibios', text: 'Los anfibios, como las ranas, los sapos y los tritones, tienen la piel lisa y húmeda. La mayoría empiezan su vida en el agua como renacuajos, y más tarde también viven en tierra.' }
    ],
    sort: {
      q: '¡Ayuda al Doctor Croac a ordenar los animales en sus grupos!',
      groups: [{ label: 'Mamíferos' }, { label: 'Aves' }, { label: 'Reptiles' }, { label: 'Anfibios' }],
      items: [
        { label: 'Murciélago', hint: 'Los murciélagos vuelan, pero tienen pelo y alimentan a sus crías con leche.' },
        { label: 'Tejón' }, { label: 'Ciervo' }, { label: 'Búho' }, { label: 'Pato' }, { label: 'Petirrojo' },
        { label: 'Serpiente' }, { label: 'Lagarto' }, { label: 'Tortuga' }, { label: 'Sapo' },
        { label: 'Tritón', hint: 'El tritón parece un lagarto, pero tiene la piel lisa y húmeda, y empieza su vida en un estanque.' }
      ]
    },
    quiz: [
      { q: 'El murciélago puede volar. ¿En qué grupo está?', choices: ['Aves', 'Mamíferos', 'Reptiles'], hint: 'Tiene pelo y alimenta a sus crías con leche.', explain: 'Los murciélagos son mamíferos: tienen pelo y alimentan a sus crías con leche.' },
      { q: '¿Qué tienen todas las aves?', choices: ['Pelo', 'Piel húmeda', 'Plumas'], hint: 'Hasta las aves que no pueden volar las tienen.', explain: 'Todas las aves tienen plumas.' },
      { q: '¿Qué animal tiene la piel seca y con escamas?', choices: ['La serpiente', 'La rana', 'El conejo'], hint: 'Es un reptil.', explain: 'Las serpientes son reptiles, con la piel seca y con escamas.' },
      { q: '¿Dónde empiezan su vida la mayoría de los anfibios?', choices: ['En un nido de ramitas', 'En el agua', 'En un huevo sobre la arena seca'], hint: 'Piensa en los renacuajos.', explain: 'La mayoría de los anfibios empiezan su vida en el agua, como renacuajos.' },
      { q: '¿Qué grupo alimenta a sus crías con leche?', choices: ['Los anfibios', 'Los peces', 'Los mamíferos'], hint: 'Los osos, los tejones y los murciélagos…', explain: 'Los mamíferos alimentan a sus crías con leche.' }
    ]
  },
  'biology2-forest-life-cycles': {
    title: 'El ciclo de vida de la rana y de la mariposa', topicName: 'Ciclos de vida de los animales', blurb: 'De los huevos de rana a la rana, del huevo a la mariposa: dos cambios asombrosos.',
    reading: [
      { title: 'Un ciclo de vida', text: 'Un ciclo de vida son los cambios por los que pasa un ser vivo, desde que empieza su vida hasta que tiene sus propias crías. Luego el ciclo vuelve a empezar.' },
      { title: 'La vida de una rana', text: 'La rana pone huevos cubiertos de gelatina, que se llaman huevas. De ellos salen renacuajos que nadan con su cola. Les crecen patas, pierden la cola y se convierten en ranitas, y luego en ranas adultas.' },
      { title: 'La vida de una mariposa', text: 'La mariposa pone huevos diminutos en una hoja. Sale una oruga que come y come. Luego forma una crisálida, y dentro su cuerpo cambia por completo. ¡Y sale una mariposa!' },
      { title: 'Un gran cambio', text: 'Un cambio tan grande en la forma del cuerpo se llama metamorfosis. Las ranas y las mariposas pasan por ella, cada una a su manera.' }
    ],
    sort: {
      q: 'Dos ciclos de vida se mezclaron en la mesa del Doctor Croac. ¿Adivinas cómo se ordenaron?',
      groups: [{ label: 'Ciclo de vida de la rana' }, { label: 'Ciclo de vida de la mariposa' }],
      items: [
        { label: 'Huevas: huevos de gelatina' }, { label: 'Oruga hambrienta' }, { label: 'Renacuajo con cola' },
        { label: 'Primero crecen las patas de atrás', hint: 'A los renacuajos les crecen las patas de atrás antes que las de delante.' },
        { label: 'Ranita con una colita' }, { label: 'Huevo diminuto en una hoja' },
        { label: 'Crisálida colgada y quieta', hint: 'Dentro, el cuerpo de la oruga está cambiando por completo.' },
        { label: 'Alas secándose al sol' }
      ],
      rule: { q: '¿Cómo se ordenaron estas tarjetas?', choices: ['Lo que vuela y lo que nada', 'Por color', 'Según el ciclo de vida del animal al que pertenecen'], hint: 'Las huevas… y una oruga. ¿En qué se convierten?', explain: 'De las huevas sale una rana, y de la oruga una mariposa: las tarjetas pertenecen a dos ciclos de vida.' }
    },
    quiz: [
      { q: '¿Qué sale de las huevas de rana?', choices: ['Renacuajos', 'Orugas', 'Pollitos'], hint: 'Nadan con su cola.', explain: 'De las huevas de rana salen renacuajos.' },
      { q: '¿En qué se convierte la oruga dentro de su crisálida?', choices: ['En una rana', 'En una mariposa', 'En una abeja'], hint: 'Sale con alas.', explain: 'Dentro de la crisálida, la oruga se convierte en mariposa.' },
      { q: '¿Qué patas le crecen primero a un renacuajo?', choices: ['Las de delante', 'Alas', 'Las de atrás'], hint: 'Las tarjetas del Doctor Croac te lo dijeron.', explain: 'A los renacuajos les crecen primero las patas de atrás, y luego las de delante.' },
      { q: '¿Cómo se llama el gran cambio en la forma del cuerpo?', choices: ['Metamorfosis', 'Hibernación', 'Evaporación'], hint: 'Una palabra larga que empieza por «meta»…', explain: 'El gran cambio de renacuajo a rana, o de oruga a mariposa, es la metamorfosis.' },
      { q: 'La vida de una mariposa es así: huevo, oruga, ___, mariposa.', choices: ['Renacuajo', 'Crisálida', 'Semilla'], hint: 'Cuelga muy quieta.', explain: 'Huevo, oruga, crisálida, mariposa.' }
    ]
  },

  // ── Anillo 3: Ramas de Farolillos ──
  'biology3-forest-food-chains': {
    title: '¿Quién se come a quién? Cadenas alimentarias', topicName: 'Cadenas alimentarias', blurb: 'Productores y consumidores, depredadores y presas: sigue la energía por el bosque.',
    reading: [
      { title: 'La comida es energía', text: 'Todos los seres vivos necesitan energía. Las plantas fabrican su propia comida con la luz del sol. Los animales consiguen energía comiendo plantas u otros animales.' },
      { title: 'Una cadena alimentaria', text: 'Una cadena alimentaria muestra quién se come a quién: hierba → conejo → zorro. Las flechas quieren decir «es comido por» y muestran hacia dónde va la energía.' },
      { title: 'Productores y consumidores', text: 'Las plantas son productoras: fabrican comida. Los animales son consumidores: comen comida. Los herbívoros comen plantas, los carnívoros comen animales y los omnívoros comen las dos cosas.' },
      { title: 'Depredador y presa', text: 'Un depredador caza otros animales para comer, y los animales que caza son sus presas. El petirrojo es depredador del gusano, pero presa del halcón.' }
    ],
    sort: {
      q: '¿Productor, come plantas, come carne o las dos cosas? ¡Ordena los seres vivos del bosque!',
      groups: [{ label: 'Productores (fabrican comida)' }, { label: 'Herbívoros (comen plantas)' }, { label: 'Carnívoros (comen animales)' }, { label: 'Omnívoros (comen de todo)' }],
      items: [
        { label: 'Roble' }, { label: 'Hierba' }, { label: 'Zarzamora' },
        { label: 'Conejo' }, { label: 'Ciervo' }, { label: 'Oruga' },
        { label: 'Búho' }, { label: 'Araña' }, { label: 'Halcón' },
        { label: 'Zorro', hint: 'Los zorros comen ratones y escarabajos, ¡pero también bayas y fruta!' },
        { label: 'Tejón', hint: 'A los tejones les encantan las lombrices, y también comen fruta y bulbos.' },
        { label: 'Oso pardo' }
      ]
    },
    quiz: [
      { q: 'En «hierba → conejo → zorro», ¿qué quiere decir la flecha?', choices: ['Es más grande que', 'Es comido por', 'Vive con'], hint: 'Muestra hacia dónde va la energía.', explain: 'La flecha quiere decir «es comido por»: la hierba es comida por el conejo, y el conejo por el zorro.' },
      { q: '¿Cómo se llama un ser vivo que fabrica su propia comida con la luz del sol?', choices: ['Depredador', 'Consumidor', 'Productor'], hint: 'Produce comida.', explain: 'Las plantas son productoras: fabrican su propia comida con la luz del sol.' },
      { q: 'El búho caza ratones. El ratón es la… del búho.', choices: ['Presa', 'Depredador', 'Productor'], hint: 'El animal cazado…', explain: 'El ratón es la presa del búho; el búho es el depredador del ratón.' },
      { q: '¿Qué palabra nombra a un animal que come plantas y animales?', choices: ['Herbívoro', 'Omnívoro', 'Carnívoro'], hint: '«Omni» quiere decir «todo».', explain: 'Un omnívoro come plantas y animales, como el zorro o el tejón.' },
      { q: '¿Qué hay al principio de casi todas las cadenas alimentarias?', choices: ['Un halcón', 'Un zorro', 'Una planta'], hint: 'Algo que fabrica su propia comida.', explain: 'Casi todas las cadenas alimentarias empiezan con una planta, un productor.' }
    ]
  },
  'biology3-forest-habitats': {
    title: 'Hábitats: un hogar para cada uno', topicName: 'Hábitats', blurb: 'El estanque, el tronco, las copas de los árboles: encuentra el hogar justo para cada ser del bosque.',
    reading: [
      { title: '¿Qué es un hábitat?', text: 'Un hábitat es el hogar natural de una planta o de un animal. Le da comida, agua, refugio y un lugar seguro para criar a sus pequeños.' },
      { title: 'Muchos hogares en un bosque', text: 'Un bosque tiene muchos hábitats: las copas de los árboles, el suelo del bosque, un tronco podrido, un estanque, un arroyo y una pradera soleada. Cada uno sirve a seres vivos distintos.' },
      { title: 'Hábitats diminutos', text: 'Hasta un solo tronco es un hábitat diminuto. Levántalo con cuidado y puede que encuentres cochinillas, escarabajos y ciempiés, que adoran la oscuridad y la humedad.' },
      { title: 'Sé un buen visitante', text: 'Cuando mires en un hábitat, hazlo con cuidado. Deja los troncos y las piedras como los encontraste, para que los hogares de los animalitos sigan a salvo.' }
    ],
    maphunt: {
      q: '¡Ayuda al Doctor Croac a encontrar el hogar justo para cada ser del bosque!',
      map: { regions: [{ label: 'El suelo del bosque' }, { label: 'Las copas de los árboles' }, { label: 'La pradera soleada' }, { label: 'El estanque' }, { label: 'El arroyo' }, { label: 'El tronco podrido' }] },
      clues: [
        { q: 'Un renacuajo necesita agua quieta para crecer. ¿Dónde vive?', hint: 'Agua quieta, no agua que corre.' },
        { q: 'A las cochinillas les encantan los lugares oscuros y húmedos llenos de madera podrida. ¡Toca su hogar!', hint: 'Busca el trozo de madera vieja.' },
        { q: 'Las abejas y las mariposas quieren muchas flores y mucho sol. ¿Dónde?', hint: 'Donde las flores crecen al aire libre.' },
        { q: 'La ardilla construye su nido muy arriba, entre las ramas. ¿Dónde?', hint: '¡Arriba, en los árboles!' },
        { q: 'Las truchas necesitan agua fresca que corre, con mucho oxígeno. ¿Dónde?', hint: 'Aquí el agua no para de moverse.' },
        { q: 'Los erizos olfatean en busca de escarabajos entre las hojas caídas. ¿Dónde?', hint: 'El suelo debajo de los árboles.' }
      ]
    },
    quiz: [
      { q: '¿Qué le da un hábitat a un ser vivo?', choices: ['Juguetes y libros', 'Comida, agua y refugio', 'Solo luz del sol'], hint: 'Todo lo que necesita para vivir.', explain: 'Un hábitat da comida, agua, refugio y un lugar seguro para criar a los pequeños.' },
      { q: '¿Dónde buscarías cochinillas?', choices: ['Debajo de un tronco húmedo y podrido', 'Sobre una roca soleada en el desierto', 'En las nubes'], hint: 'Adoran la oscuridad y la humedad.', explain: 'Las cochinillas viven en lugares oscuros y húmedos, como debajo de un tronco podrido.' },
      { q: '¿Dónde construye su nido la ardilla?', choices: ['En una madriguera bajo tierra', 'Dentro de una colmena', 'Arriba, entre las ramas'], hint: 'Lo encontraste en las copas de los árboles.', explain: 'La ardilla construye un nido redondo de ramitas y hojas arriba, entre las ramas.' },
      { q: '¿Por qué debes volver a poner el tronco en su sitio después de mirar debajo?', choices: ['Para que el hogar de los animalitos siga a salvo', 'Para que nadie sepa que miraste', 'Para que ruede'], hint: '¡Alguien vive ahí!', explain: 'Si lo vuelves a poner, el hogar de los animalitos sigue oscuro, húmedo y a salvo.' },
      { q: '¿Qué hábitat le va bien a una trucha?', choices: ['Una pradera seca', 'La copa de un árbol', 'Un arroyo de agua fresca que corre'], hint: 'Los peces necesitan agua con mucho oxígeno.', explain: 'Las truchas necesitan agua fresca que corre, como la de un arroyo.' }
    ]
  },

  // ── Anillo 4: Copa en Flor ──
  'biology4-forest-decomposers': {
    title: 'Descomponedores: los recicladores del bosque', topicName: 'Descomponedores y hongos', blurb: '¿Adónde van todas las hojas caídas? Conoce a las lombrices, las cochinillas y los hongos que reciclan el bosque.',
    reading: [
      { title: '¿Adónde van las hojas?', text: 'Cada otoño, un bosque suelta millones de hojas, pero el suelo del bosque no se llena hasta las copas de los árboles. ¡Algo las descompone!' },
      { title: 'El equipo de limpieza', text: 'Las lombrices, las cochinillas, los milpiés y las babosas comen hojas y madera muertas. Luego los hongos y las bacterias, demasiado pequeñas para verlas, terminan el trabajo.' },
      { title: 'Los hongos', text: 'Una seta es solo el fruto de un hongo, como una manzana en un árbol. La parte principal es una red de hilos finos llamada micelio, escondida en la tierra o en la madera, que digiere las hojas y los troncos muertos.' },
      { title: 'Nada se desperdicia', text: 'Los descomponedores convierten los seres muertos otra vez en nutrientes del suelo, y las plantas nuevas los usan para crecer. ¡Es el reciclaje de la naturaleza!' }
    ],
    dig: {
      q: 'Aparta con cuidado la hojarasca, ¡y encuentra a los recicladores del bosque!',
      finds: [
        { label: 'Una lombriz de tierra', text: 'Las lombrices arrastran hojas muertas bajo tierra para comérselas.', question: { q: '¿Qué comen las lombrices?', choices: ['Pájaros vivos', 'Hojas muertas y plantas podridas', 'Piedras'], hint: 'Mira lo que hay en el suelo del bosque.', explain: 'Las lombrices comen hojas muertas y plantas podridas, y sus excrementos hacen el suelo más rico.' } },
        { label: 'Setas en un tronco', text: 'Estas setas son los frutos de un hongo. Sus hilos recorren todo el tronco.', question: { q: '¿Cómo se llama la parte principal y escondida de un hongo?', choices: ['Sus raíces', 'Sus pétalos', 'Su micelio'], hint: 'Una red de hilos finos…', explain: 'El micelio, una red de hilos finos, es la parte principal de un hongo. Los hongos no tienen raíces de verdad.' } },
        { label: 'Una cochinilla', text: 'Las cochinillas no son insectos: son crustáceos que viven en tierra.', question: { q: 'Las cochinillas son primas de…', choices: ['Los cangrejos y las gambas', 'Los escarabajos y las abejas', 'Las arañas'], hint: 'Son crustáceos, con 14 patas.', explain: 'Las cochinillas son crustáceos, como los cangrejos y las gambas. Por eso necesitan lugares húmedos.' } },
        { label: 'Una migaja de tierra oscura', text: 'Esta migaja está llena de bacterias, demasiado pequeñas para verlas.', question: { q: '¿En qué convierten los descomponedores las hojas muertas?', choices: ['En plástico', 'En nutrientes para las plantas nuevas', 'En rocas'], hint: 'El reciclaje de la naturaleza…', explain: 'Los descomponedores convierten los seres muertos en nutrientes que las plantas nuevas usan para crecer.' } }
      ]
    },
    sort: {
      q: '¿Quién es quién en el bosque? ¡Ordénalos en productores, consumidores y recicladores!',
      groups: [{ label: 'Productores (fabrican comida)' }, { label: 'Consumidores (comen seres vivos)' }, { label: 'Descomponedores (reciclan lo muerto)' }],
      items: [
        { label: 'Helecho' }, { label: 'Roble' }, { label: 'Ciervo' }, { label: 'Búho' }, { label: 'Zorro' },
        { label: 'Hongo yesquero', hint: 'Los hongos no pueden fabricar comida con la luz del sol: digieren madera muerta.' },
        { label: 'Lombriz de tierra' }, { label: 'Cochinilla' }, { label: 'Bacterias' }
      ]
    },
    quiz: [
      { q: '¿Qué es una seta?', choices: ['El fruto de un hongo', 'Un árbol diminuto', 'Un tipo de animal'], hint: 'Como una manzana en un árbol…', explain: 'Una seta es el fruto de un hongo. La parte principal, el micelio, está escondida.' },
      { q: '¿Por qué el suelo del bosque no se llena de hojas?', choices: ['El viento se las lleva todas', 'La gente las barre', 'Los descomponedores las descomponen'], hint: 'Acuérdate del equipo de limpieza.', explain: 'Las lombrices, las cochinillas, los hongos y las bacterias descomponen las hojas.' },
      { q: '¿Cuál de estos es un descomponedor?', choices: ['Un zorro', 'Un hongo', 'Un helecho'], hint: 'Digiere madera muerta.', explain: 'Los hongos son descomponedores: digieren hojas y madera muertas.' },
      { q: '¿Qué le devuelven los descomponedores al suelo?', choices: ['Nutrientes', 'Plástico', 'Nieve'], hint: 'Comida para las plantas nuevas…', explain: 'Los descomponedores devuelven nutrientes al suelo para las plantas nuevas.' },
      { q: '¿Cuántas patas tiene una cochinilla?', choices: ['6', '8', '14'], hint: '¡Más que un insecto o una araña!', explain: 'Una cochinilla tiene 14 patas: siete pares.' }
    ]
  },
  'biology4-forest-adaptations': {
    title: 'Adaptaciones: hechos para su hogar', topicName: 'Adaptaciones', blurb: 'Camuflaje, pelo grueso, picos especiales: cómo los seres vivos encajan en su hogar.',
    reading: [
      { title: 'Hechos a la medida', text: 'Una adaptación es una característica que ayuda a un ser vivo a sobrevivir en su hábitat. Puede ser una parte del cuerpo, como un pico, o un comportamiento, como hibernar.' },
      { title: 'Esconderse', text: 'El camuflaje ayuda a los animales a esconderse. Las plumas marrones y moteadas del cárabo parecen corteza de árbol. Un insecto palo se parece muchísimo a una ramita.' },
      { title: 'Guardar el calor o refrescarse', text: 'Los zorros árticos tienen el pelo grueso y las orejas pequeñas, que guardan el calor. Los zorros fénec del desierto tienen orejas enormes que dejan salir el calor.' },
      { title: 'Conseguir comida', text: '¡Los picos son herramientas! El pico fuerte del pájaro carpintero cincela la madera para encontrar insectos. El pico plano del pato filtra la comida del agua. El pico ganchudo del halcón desgarra la carne.' }
    ],
    sort: {
      q: '¿Para qué sirve cada adaptación? ¡Ordena las tarjetas del Doctor Croac!',
      groups: [{ label: 'Esconderse' }, { label: 'Mantenerse caliente' }, { label: 'Conseguir comida' }, { label: 'Moverse' }],
      items: [
        { label: 'Un insecto palo con forma de ramita' }, { label: 'Las plumas color corteza de un búho' },
        { label: 'El pelaje de invierno blanco como la nieve del armiño', hint: 'En los lugares con nieve, los armiños se vuelven blancos en invierno, así cuesta verlos.' },
        { label: 'El pelo grueso del zorro ártico' }, { label: 'La capa de grasa de un oso' }, { label: 'Pingüinos apiñados' },
        { label: 'El pico como un cincel del pájaro carpintero' }, { label: 'La tela pegajosa de una araña' },
        { label: 'Los afilados dientes de delante de una ardilla', hint: 'Esos dientes abren los frutos secos.' },
        { label: 'Las patas palmeadas de un pato' }, { label: 'Las largas patas de atrás de una rana' },
        { label: 'Los largos brazos de un gibón', hint: 'Los gibones se balancean de rama en rama.' }
      ]
    },
    quiz: [
      { q: '¿Qué es una adaptación?', choices: ['Un tipo de comida', 'Una característica que ayuda a un ser vivo a sobrevivir en su hogar', 'Un nombre nuevo para un animal'], hint: 'Hechos a la medida…', explain: 'Una adaptación es una parte del cuerpo o un comportamiento que ayuda a un ser vivo a sobrevivir donde vive.' },
      { q: '¿Por qué el zorro fénec tiene orejas enormes?', choices: ['Para no pasar frío en la nieve', 'Para nadar más rápido', 'Para dejar salir el calor en el desierto caluroso'], hint: 'Vive en el desierto.', explain: 'Las orejas grandes dejan escapar el calor, y así el fénec se mantiene fresco.' },
      { q: 'El pico plano del pato sirve para…', choices: ['Filtrar la comida del agua', 'Cincelar madera', 'Desgarrar carne'], hint: 'Los patos comen en los estanques.', explain: 'El pico plano del pato filtra trocitos de comida del agua.' },
      { q: '¿Cuál de estos es un comportamiento y no una parte del cuerpo?', choices: ['Tener pelo grueso', 'Hibernar durante el invierno', 'Tener patas palmeadas'], hint: 'Algo que un animal hace…', explain: 'Hibernar es algo que hace un animal: una adaptación de comportamiento.' },
      { q: '¿Cómo se mantiene a salvo un insecto palo?', choices: ['Ruge', 'Brilla', 'Parece una ramita'], hint: 'Camuflaje…', explain: 'Un insecto palo se parece muchísimo a una ramita, así que los pájaros hambrientos no lo ven.' }
    ]
  },

  // ── Anillo 5: Altos del Nido ──
  'biology5-forest-photosynthesis': {
    title: 'Cómo fabrican comida las hojas', topicName: 'La fotosíntesis', blurb: 'Entran luz del sol, agua y aire; salen azúcar y oxígeno. Y cómo lo descubrieron los científicos.',
    reading: [
      { title: 'Comida hecha con luz', text: 'Las plantas fabrican su propia comida en las hojas. Esto se llama fotosíntesis, que quiere decir «juntar con luz».' },
      { title: 'La receta', text: 'Las hojas toman dióxido de carbono del aire por unos agujeritos, agua de las raíces y energía de la luz del sol. Fabrican azúcar como alimento y sueltan oxígeno.' },
      { title: 'Verdes por una razón', text: 'Las hojas son verdes por la clorofila, un pigmento que atrapa la luz. Absorbe la luz roja y azul y rebota la verde, por eso vemos las hojas verdes.' },
      { title: 'Nosotros también la necesitamos', text: 'El oxígeno que sueltan las plantas es el oxígeno que respiramos, y el azúcar que fabrican es el principio de casi todas las cadenas alimentarias. ¡Sin fotosíntesis, no hay bosque!' }
    ],
    sort: {
      q: 'La receta de la fotosíntesis: ¡ordena lo que entra, lo que sale y lo que no forma parte de ella!',
      groups: [{ label: 'Entra' }, { label: 'Sale' }, { label: 'No forma parte' }],
      items: [
        { label: 'Luz del sol' }, { label: 'Agua' }, { label: 'Dióxido de carbono' }, { label: 'Azúcar' }, { label: 'Oxígeno' },
        { label: 'Tierra, comida como alimento', hint: 'Las plantas toman de la tierra agua y algunos minerales, pero no se la comen: su comida se fabrica en las hojas.' },
        { label: 'Sal' }
      ]
    },
    timeline: {
      title: 'Cómo los científicos descubrieron la fotosíntesis',
      events: [
        { label: 'Se publican los resultados del sauce en una maceta de Jan van Helmont: el árbol ganó mucho peso, pero la tierra apenas perdió', when: '1648' },
        { label: 'Joseph Priestley descubre que una planta de menta «repara» el aire que una vela ha gastado', when: '1771' },
        { label: 'Jan Ingenhousz demuestra que las plantas solo lo hacen con luz, con sus partes verdes', when: '1779' },
        { label: 'Melvin Calvin gana un Premio Nobel por descubrir cómo las plantas construyen el azúcar', when: '1961' }
      ]
    },
    quiz: [
      { q: '¿Qué quiere decir «fotosíntesis»?', choices: ['Comer tierra', 'Juntar con luz', 'Beber lluvia'], hint: '«Foto» quiere decir luz.', explain: 'Fotosíntesis quiere decir «juntar con luz».' },
      { q: '¿Qué gas toman las hojas del aire para la fotosíntesis?', choices: ['Dióxido de carbono', 'Oxígeno', 'Helio'], hint: 'Es el gas que soltamos al respirar.', explain: 'Las hojas toman dióxido de carbono por unos agujeritos.' },
      { q: '¿Qué hace verdes a las hojas?', choices: ['Pintura verde de la tierra', 'Algas por encima', 'La clorofila'], hint: 'Un pigmento que atrapa la luz…', explain: 'La clorofila absorbe la luz roja y azul y rebota la verde.' },
      { q: '¿Qué demostró el sauce de van Helmont?', choices: ['Los árboles crecen mejor a oscuras', 'El peso del árbol no salió de la tierra', 'La tierra se convierte en madera'], hint: 'La tierra apenas perdió peso.', explain: 'El sauce ganó mucho peso, pero la tierra apenas perdió. Hoy sabemos que casi todo un árbol está construido con el dióxido de carbono del aire.' },
      { q: '¿Qué dos cosas fabrican las plantas en la fotosíntesis?', choices: ['Sal y humo', 'Leche y miel', 'Azúcar y oxígeno'], hint: 'Una es comida; la otra la respiramos.', explain: 'Las plantas fabrican azúcar como alimento y sueltan oxígeno.' }
    ]
  },
  'biology5-forest-pollination': {
    title: 'Flores, polinizadores y semillas viajeras', topicName: 'Polinización y dispersión de semillas', blurb: 'Cómo viaja el polen de flor en flor, y cómo viajan las semillas a sus nuevos hogares.',
    reading: [
      { title: 'El polen en movimiento', text: 'Para hacer semillas, una flor necesita que el polen llegue a su centro pegajoso, el estigma, normalmente polen de otra flor de la misma especie. Esto se llama polinización.' },
      { title: 'Ayudantes con alas', text: 'Las abejas, las mariposas, las polillas, los escarabajos, las aves y hasta los murciélagos llevan polen. Las flores les pagan con néctar dulce. Los colores vivos y los aromas son como carteles que dicen «¡aquí hay comida!».' },
      { title: 'Flores del viento', text: 'Las hierbas, el avellano y los pinos usan el viento. Sus flores son pequeñas y sencillas, sin néctar, pero hacen nubes de polen ligero.' },
      { title: 'Las semillas se van de viaje', text: 'Después de la polinización, la flor hace semillas dentro de un fruto. Luego las semillas viajan: las del arce giran con el viento, los cadillos se enganchan al pelo, los pájaros se comen las bayas y los cocos flotan.' }
    ],
    sort: {
      q: '¿Cómo manda cada planta sus semillas a lugares nuevos? ¡Ordénalas!',
      groups: [{ label: 'Con el viento' }, { label: 'Con los animales' }, { label: 'Con el agua' }, { label: 'Abriéndose de golpe' }],
      items: [
        { label: 'Pelusa de diente de león' }, { label: '«Helicópteros» del arce' }, { label: 'Semillas de pino con alitas' },
        { label: 'Cadillos que se pegan al pelo', hint: 'Los cadillos tienen ganchitos que se enganchan en el pelo y en los calcetines.' },
        { label: 'Zarzamoras que comen los pájaros' },
        { label: 'Bellotas que entierran los arrendajos', hint: 'Los arrendajos y las ardillas entierran bellotas, ¡y se olvidan de algunas!' },
        { label: 'Cocos' }, { label: 'Semillas de aliso flotando por un arroyo' },
        { label: 'Vainas de tojo que crujen y lanzan semillas', hint: 'En los días de calor, las vainas del tojo se abren de golpe con un crac.' },
        { label: 'Vainas de balsamina que estallan' }
      ]
    },
    sim: { predict: { q: 'El Doctor Croac suelta una hoja de papel plana y la misma hoja arrugada como una bola. ¿Cuál llega última al suelo?', choices: ['La bola arrugada', 'La hoja plana', 'Llegan a la vez'], explain: 'La hoja plana atrapa mucho aire, así que baja flotando despacio. Las semillas con alas o pelusa hacen lo mismo, y así el viento tiene tiempo de llevarlas muy lejos.' } },
    quiz: [
      { q: '¿Qué es la polinización?', choices: ['Regar una planta', 'Una semilla que cae', 'Que el polen llegue al centro pegajoso de una flor'], hint: 'El polen en movimiento…', explain: 'La polinización es cuando el polen llega al estigma, el centro pegajoso de una flor, para que pueda hacer semillas.' },
      { q: '¿Qué les dan muchas flores a los insectos por llevar su polen?', choices: ['Néctar dulce', 'Semillas', 'Hojas'], hint: 'Las abejas hacen miel con él.', explain: 'Las flores les pagan a sus polinizadores con néctar dulce.' },
      { q: '¿Por qué las flores polinizadas por el viento suelen ser pequeñas y sencillas?', choices: ['Son tímidas', 'No necesitan atraer animales', 'Crecen a oscuras'], hint: '¿Quién lleva su polen?', explain: 'El viento lleva su polen, así que no necesitan colores vivos, aroma ni néctar.' },
      { q: '¿Cómo viajan los cadillos?', choices: ['Flotando en el mar', 'Girando con el viento', 'Pegados al pelo de los animales'], hint: 'Tienen ganchitos.', explain: 'Los cadillos se enganchan al pelo de los animales que pasan y se sueltan en un lugar nuevo.' },
      { q: '¿Por qué una hoja de papel plana cae más despacio que una arrugada?', choices: ['Atrapa más aire', 'Pesa más', 'La gravedad no la atrae'], hint: 'Acuérdate del experimento.', explain: 'La hoja plana atrapa más aire, y eso la frena, igual que a una semilla con alas.' }
    ]
  },

  // ── Anillo 6: Anillos de Girasol ──
  'biology6-forest-food-webs': {
    title: 'Redes alimentarias y el equilibrio de la naturaleza', topicName: 'Redes alimentarias y ecosistemas', blurb: 'Tira de un hilo y toda la red se mueve: redes alimentarias, energía y especies clave.',
    reading: [
      { title: 'Las cadenas se unen en redes', text: 'Casi todos los animales comen más de una cosa, y se los come más de un animal. Las cadenas alimentarias unidas forman una red alimentaria. En la red del Gran Árbol, las orugas comen hojas de roble, los herrerillos comen orugas y los gavilanes comen herrerillos; los conejos comen hierba, y los zorros comen conejos.' },
      { title: 'La energía se pierde', text: 'En cada paso hacia arriba de una cadena alimentaria, la mayor parte de la energía se usa para vivir (moverse, crecer, mantenerse caliente) y solo pasa una décima parte, más o menos. Por eso hay muchos menos zorros que conejos.' },
      { title: 'Especies clave', text: 'Algunas especies sostienen una red entera. Cuando en 1995 se devolvieron los lobos al Parque Nacional de Yellowstone, en Estados Unidos, cambiaron los lugares donde pastaban los uapitíes, y en algunas zonas los árboles jóvenes y las orillas de los ríos empezaron a recuperarse.' },
      { title: 'Tira de un hilo', text: 'Si cambias una parte de una red, otras partes también cambian. Los científicos estudian estas conexiones antes de decidir cómo proteger un hábitat.' }
    ],
    sort: {
      q: 'Una enfermedad hace que este año haya muy pocas orugas. ¿Qué pasa con cada una de estas cosas?',
      groups: [{ label: 'Aumenta' }, { label: 'Disminuye' }, { label: 'Cambia poco o nada' }],
      items: [
        { label: 'Hojas de roble que nadie se come', hint: '¿Quién suele comerse las hojas del roble?' },
        { label: 'Pollitos de herrerillo que llegan a adultos', hint: 'Los herrerillos alimentan a sus pollitos con orugas.' },
        { label: 'Comida para los gavilanes', hint: 'Los gavilanes comen herrerillos, y habrá menos.' },
        { label: 'Conejos en la pradera', hint: 'Los conejos comen hierba, no hojas de roble ni orugas.' },
        { label: 'Comida para los zorros' }, { label: 'Hierba en la pradera' }
      ]
    },
    timeline: {
      title: 'Los lobos de Yellowstone, y aprender cómo funcionan las redes',
      events: [
        { label: 'Yellowstone se convierte en el primer parque nacional del mundo', when: '1872' },
        { label: 'Desaparecen de Yellowstone las últimas manadas de lobos', when: '1926' },
        { label: 'El libro «Primavera silenciosa» de Rachel Carson muestra cómo los venenos pasan por las cadenas alimentarias', when: '1962' },
        { label: 'Los lobos vuelven a Yellowstone', when: '1995' }
      ]
    },
    quiz: [
      { q: '¿Qué es una red alimentaria?', choices: ['Una sola cadena alimentaria', 'Muchas cadenas alimentarias unidas', 'Una tela de araña hecha de comida'], hint: 'Las cadenas se unen…', explain: 'Una red alimentaria son muchas cadenas alimentarias unidas.' },
      { q: '¿Qué parte de la energía de un nivel pasa al siguiente, más o menos?', choices: ['Una décima parte', 'Toda', 'La mitad'], hint: 'Casi toda se usa para vivir.', explain: 'Solo pasa una décima parte, más o menos; el resto se usa para moverse, crecer y mantenerse caliente.' },
      { q: '¿Por qué hay menos zorros que conejos?', choices: ['Los zorros son tímidos', 'Los conejos son más grandes', 'En cada paso de la cadena se pierde energía'], hint: 'Piensa en la energía.', explain: 'Se pierde tanta energía en cada paso que los conejos solo pueden alimentar a unos pocos zorros.' },
      { q: '¿Qué es una especie clave?', choices: ['El animal más grande de un bosque', 'Una especie que sostiene toda una red alimentaria', 'Una especie que vive en las piedras'], hint: 'Como los lobos de Yellowstone.', explain: 'Una especie clave tiene un gran efecto en toda su red, mucho mayor de lo que haría pensar su número.' },
      { q: '¿Cuándo volvieron los lobos a Yellowstone?', choices: ['1872', '1926', '1995'], hint: 'Mira tu línea del tiempo.', explain: 'Los lobos volvieron a Yellowstone en 1995.' }
    ]
  },
  'biology6-forest-body-systems': {
    title: 'El trabajo en equipo de tu cuerpo', topicName: 'Los sistemas del cuerpo humano', blurb: 'Corazón, pulmones, estómago y cerebro: los sistemas que te mantienen en marcha.',
    reading: [
      { title: 'Sistemas', text: 'Tu cuerpo está hecho de órganos, como el corazón y los pulmones. Los órganos trabajan en equipos llamados sistemas, y cada sistema tiene una gran tarea.' },
      { title: 'Respiración y sangre', text: 'Tus pulmones toman oxígeno del aire. Tu corazón bombea la sangre por todo tu cuerpo y lleva ese oxígeno y la comida a cada célula, unas 100 000 veces al día.' },
      { title: 'Comida y movimiento', text: 'Tu sistema digestivo deshace la comida para que la sangre pueda llevarla. Tu esqueleto, de unos 206 huesos, te sostiene, y tus músculos tiran de los huesos para moverlos.' },
      { title: 'El centro de control', text: 'Tu cerebro y tus nervios llevan mensajes por todo tu cuerpo en una fracción de segundo. Ayudan a que todos los sistemas trabajen juntos.' }
    ],
    sort: {
      q: '¿A qué sistema pertenece cada parte del cuerpo? ¡Ordena las tarjetas!',
      groups: [{ label: 'Corazón y sangre' }, { label: 'Respiración' }, { label: 'Digestión' }, { label: 'Control: cerebro y nervios' }],
      items: [
        { label: 'Corazón' }, { label: 'Vasos sanguíneos' }, { label: 'Pulmones' }, { label: 'Tráquea' },
        { label: 'Dientes', hint: 'Masticar es el primer paso de la digestión.' },
        { label: 'Estómago' }, { label: 'Intestino delgado' }, { label: 'Cerebro' },
        { label: 'Médula espinal', hint: 'Baja por tu espalda, dentro de la columna vertebral, llevando mensajes.' },
        { label: 'Nervios' }
      ]
    },
    quiz: [
      { q: '¿Qué hace el corazón?', choices: ['Deshace la comida', 'Bombea la sangre por todo el cuerpo', 'Te sostiene'], hint: 'Pon la mano en el pecho…', explain: 'El corazón bombea la sangre por todo el cuerpo, unas 100 000 veces al día.' },
      { q: '¿Qué órgano toma oxígeno del aire?', choices: ['El estómago', 'El cerebro', 'Los pulmones'], hint: '¡Respira hondo!', explain: 'Los pulmones toman oxígeno cuando inspiras.' },
      { q: '¿Cuántos huesos tiene una persona adulta, más o menos?', choices: ['206', '26', '2006'], hint: 'Un par de cientos…', explain: 'Una persona adulta tiene unos 206 huesos.' },
      { q: '¿Cómo mueven los músculos tus huesos?', choices: ['Les meten aire', 'Tiran de ellos', 'Los derriten'], hint: 'Los músculos solo pueden tirar.', explain: 'Los músculos tiran de los huesos para moverlos.' },
      { q: '¿Qué sistema lleva mensajes por todo tu cuerpo?', choices: ['El sistema digestivo', 'El esqueleto', 'El sistema nervioso'], hint: 'El cerebro es su centro de control.', explain: 'El sistema nervioso (el cerebro, la médula espinal y los nervios) lleva los mensajes.' }
    ]
  },

  // ── Anillo 7: Corona Estelar ──
  'biology7-forest-wood-wide-web': {
    title: '¿Los árboles hablan? La red del bosque', topicName: 'Hongos, raíces y la red del bosque', blurb: 'Los árboles y los hongos hacen intercambios bajo tierra. ¿Qué está demostrado y qué sigue siendo una pregunta?',
    reading: [
      { title: 'Socios bajo tierra', text: 'Casi todas las plantas, incluidos casi todos los árboles, se asocian con hongos. Los hilos del hongo rodean las raíces más finas del árbol o crecen dentro de ellas. Esta sociedad se llama micorriza, que quiere decir «hongo-raíz».' },
      { title: 'Un trato justo', text: 'El hongo le trae al árbol agua y nutrientes, como fósforo y nitrógeno, desde lejos a través del suelo. El árbol le paga al hongo con azúcar fabricado en sus hojas.' },
      { title: 'Una red', text: 'Los hilos de los hongos pueden unir las raíces de varios árboles. En 1997, Suzanne Simard y su equipo demostraron que el carbono podía pasar de un árbol a otro por esas conexiones. La gente la apodó la «wood wide web», la internet del bosque.' },
      { title: 'Ciencia con cuidado', text: 'Algunas ideas van más allá: que los «árboles madre» alimentan a sus pequeños, o que los árboles se avisan unos a otros del peligro. Los científicos todavía discuten cuánto pasa esto de verdad en los bosques salvajes. Los buenos científicos dicen qué está demostrado y qué sigue siendo una pregunta.' }
    ],
    sort: {
      q: '¿Bien demostrado, todavía en estudio o falso? ¡Ordena las afirmaciones sobre la red del bosque!',
      groups: [{ label: 'Bien demostrado con pruebas' }, { label: 'Todavía en estudio' }, { label: 'Falso' }],
      items: [
        { label: 'Los hongos ayudan a las raíces de los árboles a conseguir agua y nutrientes' },
        { label: 'Los árboles les dan azúcar a los hongos' },
        { label: 'Los hilos de los hongos pueden unir más de un árbol' },
        { label: 'Los grandes «árboles madre» alimentan mucho a sus plántulas por la red', hint: 'Algunos estudios lo sugieren; otros encontraron poco efecto. Los científicos todavía lo están poniendo a prueba en bosques reales.' },
        { label: 'Los árboles se avisan de los ataques de insectos a través de los hongos', hint: 'Experimentos de laboratorio con algunas plantas encontraron señales de ello, pero todavía no está claro cuánto pasa en los bosques salvajes.' },
        { label: 'Los árboles hablan entre ellos con palabras' },
        { label: 'Las setas son las raíces de los árboles', hint: 'Las setas son los frutos de los hongos, no una parte del árbol.' },
        { label: 'Los hongos fabrican su propia comida con la luz del sol', hint: 'Los hongos no pueden hacer la fotosíntesis. Por eso intercambian cosas con los árboles a cambio de azúcar.' }
      ]
    },
    timeline: {
      title: 'Descubrir la red escondida',
      events: [
        { label: 'Las plantas se asocian con hongos, como muestran los fósiles más antiguos de plantas terrestres', when: 'hace unos 400 millones de años' },
        { label: 'Albert Bernhard Frank le pone a esta sociedad el nombre de «micorriza»', when: '1885' },
        { label: 'El equipo de Suzanne Simard demuestra que el carbono pasa de un árbol a otro a través de los hongos', when: '1997' },
        { label: 'Los científicos revisan las pruebas y piden estudios más cuidadosos en bosques reales', when: '2023' }
      ]
    },
    quiz: [
      { q: '¿Qué es una micorriza?', choices: ['Un tipo de corteza de árbol', 'Una sociedad entre un hongo y las raíces de una planta', 'Un animal del bosque'], hint: 'Quiere decir «hongo-raíz».', explain: 'Una micorriza es una sociedad entre un hongo y las raíces de una planta.' },
      { q: '¿Qué le da el árbol al hongo?', choices: ['Azúcar', 'Fósforo', 'Tierra'], hint: 'Se fabrica en las hojas.', explain: 'El árbol le paga al hongo con el azúcar que fabrica con la fotosíntesis.' },
      { q: '¿Qué le da el hongo al árbol?', choices: ['Luz del sol', 'Hojas', 'Agua y nutrientes'], hint: 'Desde lejos, a través del suelo…', explain: 'El hongo le trae agua y nutrientes como el fósforo y el nitrógeno.' },
      { q: '¿Quién demostró en 1997 que el carbono podía pasar de un árbol a otro a través de los hongos?', choices: ['Charles Darwin', 'Suzanne Simard y su equipo', 'Jane Goodall'], hint: 'Mira tu línea del tiempo.', explain: 'Suzanne Simard y su equipo, en 1997.' },
      { q: 'Un buen científico que describe la red del bosque debería…', choices: ['Decir qué está demostrado y qué sigue siendo una pregunta', 'Creerse cada afirmación emocionante', 'No cambiar nunca de opinión'], hint: 'Ciencia con cuidado…', explain: 'Los buenos científicos dejan claro qué muestran las pruebas y qué hay que seguir poniendo a prueba.' }
    ]
  },
  'biology7-forest-conservation': {
    title: 'Salvar especies: biodiversidad y conservación', topicName: 'Biodiversidad y conservación', blurb: 'Por qué importa la variedad de la vida, qué la amenaza y cómo la protege la gente.',
    reading: [
      { title: 'Biodiversidad', text: 'La biodiversidad es la variedad de la vida: todas las especies distintas, las diferencias dentro de cada especie y todos los hábitats distintos. Los científicos han puesto nombre a unos 2 millones de especies, y quedan millones más por descubrir.' },
      { title: 'Por qué importa la variedad', text: 'Cada especie es un hilo de la red de la naturaleza. Las abejas polinizan los cultivos, los bosques limpian el agua y guardan carbono, y muchas medicinas vinieron de plantas y hongos. Si se pierden demasiados hilos, la red se deshace.' },
      { title: 'Amenazas', text: 'La mayor amenaza es la pérdida de hábitat: bosques talados y humedales desecados. La contaminación, la caza excesiva, las especies invasoras y el cambio climático la empeoran.' },
      { title: 'Esperanza', text: '¡La conservación funciona! Las áreas protegidas, los programas de cría y los bancos de semillas ayudan. En 2016, el panda gigante pasó de «En peligro» a «Vulnerable», después de que China protegiera sus bosques de bambú.' }
    ],
    maphunt: {
      q: '¡Encuentra dónde viven estos animales y los lugares que hay que proteger!',
      clues: [
        { q: 'Los pandas gigantes mastican bambú en los bosques de montaña de este continente.', hint: 'El continente más grande.' },
        { q: 'Los gorilas de montaña viven en bosques con niebla sobre volcanes, en el centro de este continente.', hint: 'Al sur de Europa.' },
        { q: 'Los koalas viven en bosques de eucaliptos solo en este continente.', hint: 'Mira hacia el sureste.' },
        { q: 'Los osos polares cazan focas sobre el hielo marino de este océano.', hint: 'Justo arriba del todo del mundo.' },
        { q: 'Los pingüinos emperador crían a sus polluelos sobre el hielo de este continente helado.', hint: 'Justo abajo del todo del mundo.' },
        { q: 'La Amazonia, hogar de más o menos una de cada diez especies conocidas, está en este continente.', hint: 'En América, en el ecuador.' }
      ]
    },
    sort: {
      q: '¿Ayuda o hace daño? ¡Ordena lo que hace la gente!',
      groups: [{ label: 'Ayuda a la vida silvestre' }, { label: 'Hace daño a la vida silvestre' }],
      items: [
        { label: 'Plantar árboles autóctonos' }, { label: 'Proteger una reserva natural' }, { label: 'Guardar semillas en un banco de semillas' },
        { label: 'Dejar un hueco para erizos en la valla del jardín', hint: 'Los erizos recorren mucho camino cada noche; los huecos pequeños los dejan pasar.' },
        { label: 'Desecar un humedal para construir encima' }, { label: 'Tirar basura de plástico' },
        { label: 'Soltar peces de mascota en un estanque silvestre', hint: 'Las mascotas sueltas pueden volverse invasoras y desequilibrar la red alimentaria.' },
        { label: 'Talar una selva tropical para plantar un solo cultivo' }
      ]
    },
    quiz: [
      { q: '¿Qué es la biodiversidad?', choices: ['El número de árboles de un parque', 'Un tipo de planta', 'La variedad de la vida'], hint: '«Bio» quiere decir vida; «diversidad» quiere decir variedad.', explain: 'La biodiversidad es la variedad de la vida: las especies, las diferencias dentro de ellas y los hábitats.' },
      { q: '¿Cuál es hoy la mayor amenaza para la vida silvestre?', choices: ['La pérdida de hábitat', 'Que haya demasiados zoológicos', 'La lluvia'], hint: 'Bosques talados, humedales desecados…', explain: 'La pérdida de hábitat es la mayor amenaza: los animales y las plantas se quedan sin hogar.' },
      { q: 'En 2016, el panda gigante pasó de «En peligro» a…', choices: ['Extinto en estado silvestre', 'Vulnerable', 'En peligro crítico'], hint: 'Un paso hacia la seguridad.', explain: 'Pasó a «Vulnerable», un paso más seguro, después de que se protegieran sus bosques.' },
      { q: '¿Por qué soltar peces de mascota en un estanque silvestre puede hacer daño?', choices: ['Se sienten solos', 'Cambian el color del agua', 'Pueden volverse invasores y desequilibrar la red alimentaria'], hint: 'No son de ahí.', explain: 'Las mascotas sueltas pueden extenderse, comerse a las especies silvestres o quitarles la comida, y desequilibrar la red alimentaria.' },
      { q: '¿Qué medicina famosa salió de un moho, un tipo de hongo?', choices: ['La penicilina', 'La vitamina C', 'La pasta de dientes'], hint: 'Alexander Fleming la descubrió en 1928.', explain: 'La penicilina, el primer antibiótico, salió de un moho.' }
    ]
  }
};
