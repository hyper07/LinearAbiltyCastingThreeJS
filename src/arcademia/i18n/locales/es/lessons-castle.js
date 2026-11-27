/** Español — the Sky Castle's lessons (overlay on content/castle.js; text only). */
export default {
  // ───────── Matemáticas del Castillo (Escuela de la Torre del Reloj) ─────────
  // ── Calle 1: Mercado de la Puerta ──
  'm1-castle-towers-flags': {
    title: "Contar torres y banderas", topicName: "Contar", blurb: "Cuenta las torres, las banderas y las ventanas redondas del Castillo del Cielo.",
    reading: [
      { title: "Torres y banderas", text: "El Castillo del Cielo tiene muchas torres, y cada torre tiene una bandera en lo alto. ¡Vamos a contarlas! Señala cada una una sola vez y di un número." },
      { title: "Formas en el castillo", text: "Mira bien: las banderas son triángulos con 3 lados, las ventanas son círculos y los tejados de las torres son conos puntiagudos." },
      { title: "El último número", text: "Cuando lo hayas contado todo, el último número que dijiste te dice cuántos hay." }
    ],
    quiz: [
      { q: "¿Cuántas banderas ves? 🚩🚩🚩🚩🚩🚩🚩", choices: ["7", "6", "8"], hint: "Señala cada bandera una vez mientras cuentas.", explain: "1, 2, 3, 4, 5, 6, 7. Hay 7 banderas." },
      { q: "¿Cuántos lados tiene una bandera con forma de triángulo?", choices: ["4", "3", "2"], hint: "Pasa el dedo por el borde y cuenta los lados rectos.", explain: "Un triángulo siempre tiene 3 lados." },
      { q: "Cuenta los castillitos del estandarte: 🏰🏰🏰🏰🏰🏰🏰🏰🏰🏰🏰🏰. ¿Cuántos hay?", choices: ["11", "13", "12"], hint: "Cuenta los 10 primeros y luego sigue contando.", explain: "10, y luego 11, 12. Hay 12 castillos." },
      { q: "El guardia cuenta los escalones: 16, 17, 18. ¿Qué número va después?", choices: ["19", "20", "17"], hint: "¿Qué número va justo después del 18?", explain: "Después del 18 va el 19." },
      { q: "¿Qué forma tienen las ventanas redondas del castillo?", choices: ["Triángulos", "Círculos", "Cuadrados"], hint: "Son redondas y no tienen esquinas.", explain: "Las ventanas redondas son círculos." }
    ]
  },
  'm1-castle-market-buns': {
    title: "Bollos en el mercado", topicName: "Restas hasta 10", blurb: "La panadera vende bollos en el mercado del castillo. ¿Cuántos quedan?",
    reading: [
      { title: "Día de mercado", text: "Cada semana, el pueblo del castillo tiene mercado. La panadera trae bollos calentitos y la gente viene a comprarlos." },
      { title: "Quitar", text: "Cuando se vende un bollo, en la bandeja queda uno menos. Al quitar, sabemos cuántos quedan." },
      { title: "Salta hacia atrás", text: "En la recta numérica, empieza en el primer número y da un salto hacia atrás por cada uno que quitas. Donde caes, esa es la respuesta." }
    ],
    quiz: [
      { q: "La panadera tiene 8 bollos. Vende 3. ¿Cuántos le quedan?", choices: ["5", "11", "4"], hint: "Empieza en el 8 y salta 3 hacia atrás.", explain: "8 − 3 = 5. Quedan 5 bollos." },
      { q: "Hay 10 manzanas en el puesto. Se venden 4. ¿Cuántas quedan?", choices: ["14", "6", "5"], hint: "Empieza en el 10 y salta 4 hacia atrás.", explain: "10 − 4 = 6 manzanas." },
      { q: "Hay 7 ocas en el mercado. 2 se van a casa contoneándose. ¿Cuántas ocas siguen allí?", choices: ["9", "4", "5"], hint: "Empieza en el 7 y salta 2 hacia atrás.", explain: "7 − 2 = 5 ocas." },
      { q: "La panadera tiene 6 empanadas y vende las 6. ¿Cuántas le quedan?", choices: ["0", "6", "12"], hint: "Si las quitas todas…", explain: "6 − 6 = 0. No queda ninguna, ¡así que la panadera ya puede irse a casa!" },
      { q: "Había 9 bollos. Ahora hay 5. ¿Cuántos se vendieron?", choices: ["4", "14", "5"], hint: "Cuenta hacia delante desde el 5 hasta el 9.", explain: "5 y 4 más son 9, así que se vendieron 4 bollos." }
    ]
  },

  // ── Calle 2: Calle de las Cintas ──
  'm2-castle-roman-numerals': {
    title: "Números romanos en la torre del reloj", topicName: "Valor posicional", blurb: "Lee los números antiguos de la esfera del reloj y descubre por qué las decenas y las unidades hacen más fáciles nuestros números.",
    reading: [
      { title: "Letras para los números", text: "Muchos relojes antiguos tienen números romanos: números escritos con letras. I significa 1, V significa 5 y X significa 10." },
      { title: "Súmalas", text: "Junta las letras y súmalas: XII es 10 + 1 + 1 = 12. XXIII es 10 + 10 + 1 + 1 + 1 = 23." },
      { title: "Una delante", text: "Una letra pequeña delante de una más grande quiere decir que hay que restarla: IV es 1 antes del 5, o sea 4, e IX es 1 antes del 10, o sea 9." },
      { title: "Decenas y unidades", text: "Nuestros números usan lugares. En el 23, el 2 son 2 decenas y el 3 son 3 unidades, así que es corto y fácil de leer." }
    ],
    quiz: [
      { q: "¿Qué número es XII en el reloj?", choices: ["12", "21", "3"], hint: "X es 10 y cada I es 1.", explain: "X + I + I = 10 + 1 + 1 = 12." },
      { q: "¿Qué número es XXV?", choices: ["52", "25", "7"], hint: "Dos X y una V.", explain: "10 + 10 + 5 = 25." },
      { q: "En el número 47, ¿qué significa el 4?", choices: ["4 unidades", "4 centenas", "4 decenas"], hint: "El 4 está en el lugar de las decenas.", explain: "El 4 está en el lugar de las decenas, así que son 4 decenas, o sea 40." },
      { q: "IV es 1 antes del 5. ¿Qué número es?", choices: ["4", "6", "15"], hint: "Quítale 1 al 5.", explain: "IV es 5 menos 1, así que es 4. (¡Algunos relojes lo escriben IIII!)" },
      { q: "¿Cuántas decenas hay en XXX?", choices: ["3", "30", "1", "10"], hint: "Cada X es una decena.", explain: "XXX son tres X, así que son 3 decenas: 30." }
    ]
  },
  'm2-castle-bell-chimes': {
    title: "Campanadas de 2 en 2, de 5 en 5 y de 10 en 10", topicName: "Contar de 2 en 2, de 5 en 5 y de 10 en 10", blurb: "Cuenta los minutos del reloj de cinco en cinco, las campanas de dos en dos y los escalones de la torre de diez en diez.",
    reading: [
      { title: "De cinco en cinco en el reloj", text: "La esfera del reloj grande tiene 12 números. El minutero tarda 5 minutos en ir de un número al siguiente: 5, 10, 15, 20…" },
      { title: "Campanas por parejas", text: "Los campaneros tocan dos campanas a la vez. Contar de dos en dos es rápido: 2, 4, 6, 8, 10." },
      { title: "Escalones de diez en diez", text: "El campanario tiene muchos escalones. Cada diez escalones hay una ventanita: 10, 20, 30, 40…" }
    ],
    quiz: [
      { q: "Cuenta de cinco en cinco: 5, 10, 15, 20, … ¿Qué número va después?", choices: ["21", "25", "30"], hint: "Suma 5 más.", explain: "20 y 5 más son 25." },
      { q: "El minutero señala el 3. ¿Cuántos minutos han pasado desde la hora en punto?", choices: ["3", "15", "30"], hint: "Cuenta de cinco en cinco: un cinco por cada número.", explain: "5, 10, 15. Han pasado 15 minutos." },
      { q: "Cuenta de dos en dos: 2, 4, 6, 8, … ¿Qué número va después?", choices: ["9", "12", "10"], hint: "Suma 2 más.", explain: "8 y 2 más son 10." },
      { q: "Cuenta de diez en diez: 10, 20, 30, 40, … ¿Qué número va después?", choices: ["50", "41", "400"], hint: "Suma 10 más.", explain: "40 y 10 más son 50." },
      { q: "Suenan 4 parejas de campanas. ¿Cuántas campanas son?", choices: ["6", "8", "4", "10"], hint: "Cuenta de dos en dos 4 veces.", explain: "2, 4, 6, 8. Son 8 campanas." }
    ]
  },

  // ── Calle 3: Patio del Dragón ──
  'm3-castle-floor-tiles': {
    title: "Baldosas en filas", topicName: "Tablas de multiplicar", blurb: "Coloca baldosas en filas para el gran salón del castillo y busca formas que encajan sin dejar huecos.",
    reading: [
      { title: "Filas de baldosas", text: "Los suelos de los castillos solían cubrirse con baldosas. 4 filas de 5 baldosas forman una matriz: 4 × 5 = 20 baldosas." },
      { title: "¡Sin huecos!", text: "Los cuadrados, los triángulos y los hexágonos pueden encajar sin dejar huecos entre ellos. Un dibujo así se llama teselado." },
      { title: "Dibujos de espejo", text: "Muchos dibujos de baldosas son simétricos: si los doblas por la mitad, una mitad coincide con la otra, como un reflejo en un espejo." },
      { title: "Dale la vuelta", text: "3 × 6 es lo mismo que 6 × 3. Gira la matriz de lado y sigue habiendo 18 baldosas." }
    ],
    quiz: [
      { q: "Un suelo tiene 5 filas de 6 baldosas. ¿Cuántas baldosas son?", choices: ["11", "30", "25"], hint: "5 × 6", explain: "5 × 6 = 30 baldosas." },
      { q: "¿Qué forma encaja sin dejar huecos, como las baldosas del suelo?", choices: ["Círculos", "Cuadrados", "Estrellas"], hint: "Los círculos siempre dejan huequitos entre ellos.", explain: "Los cuadrados encajan sin dejar huecos. Los círculos y las estrellas dejan huecos." },
      { q: "Hay 7 filas de 4 baldosas. ¿Cuántas baldosas hay?", choices: ["28", "24", "11"], hint: "7 × 4: calcula el doble de 7 y luego el doble otra vez.", explain: "7 × 4 = 28 baldosas." },
      { q: "¿Qué es lo mismo que 8 × 3?", choices: ["8 + 3", "3 × 8", "8 × 8"], hint: "Girar una matriz no cambia cuántas hay.", explain: "8 × 3 y 3 × 8 dan 24 los dos." },
      { q: "Un salón necesita 9 filas de 5 baldosas. ¿Cuántas baldosas son?", choices: ["40", "14", "45", "54"], hint: "Cuenta de cinco en cinco 9 veces, o calcula 10 × 5 y quita un 5.", explain: "9 × 5 = 45 baldosas." }
    ]
  },
  'm3-castle-clock-fractions': {
    title: "Y media y y cuarto", topicName: "Fracciones", blurb: "Corta la esfera del reloj en mitades y cuartos para leer la hora en la torre del reloj.",
    reading: [
      { title: "Un reloj es un círculo", text: "El minutero da una vuelta entera al reloj en una hora: 60 minutos." },
      { title: "Y media", text: "Cuando el minutero ha dado media vuelta, señala el 6. Media hora son 30 minutos, así que son «y media»." },
      { title: "Y cuarto, menos cuarto", text: "Corta el reloj en 4 partes iguales. Un cuarto de hora son 15 minutos. A «y cuarto», el minutero señala el 3; a «menos cuarto», señala el 9." }
    ],
    quiz: [
      { q: "¿Cuántos minutos tiene media hora?", choices: ["15", "30", "60"], hint: "La mitad de 60.", explain: "La mitad de 60 minutos son 30 minutos." },
      { q: "¿Cuántos minutos tiene un cuarto de hora?", choices: ["15", "25", "4"], hint: "60 minutos repartidos en 4 partes iguales.", explain: "60 ÷ 4 = 15 minutos." },
      { q: "El minutero señala el 6. ¿Qué hora es?", choices: ["En punto", "Y cuarto", "Y media"], hint: "La aguja ha dado media vuelta.", explain: "Media vuelta al reloj es «y media»." },
      { q: "Una empanada se corta en 4 trozos iguales. Te comes 1. ¿Qué fracción te has comido?", choices: ["1/2", "1/4", "4/1"], hint: "1 trozo de 4 trozos iguales.", explain: "Te comiste 1 de 4 trozos iguales: 1/4, un cuarto." },
      { q: "¿Qué dura más: media hora o un cuarto de hora?", choices: ["Media hora", "Un cuarto de hora", "Duran lo mismo"], hint: "Menos trozos quiere decir trozos más grandes.", explain: "Media hora son 30 minutos; un cuarto de hora son solo 15." }
    ]
  },

  // ── Calle 4: Paseo del Campanario ──
  'm4-castle-feet-thumbs': {
    title: "Pies, pulgares y pasos", topicName: "2 cifras × 1 cifra", blurb: "Hace mucho tiempo, la gente medía con su cuerpo. Multiplica medidas antiguas para construir un castillo.",
    reading: [
      { title: "Medidas del cuerpo", text: "Hace mucho tiempo, la gente medía con su cuerpo: el ancho de un pulgar, un pie, lo largo de un brazo. ¡Pero cada persona tiene los pies de un tamaño distinto!" },
      { title: "Que sean iguales", text: "Por eso los pueblos guardaban varas de medir oficiales, y la pulgada, el pie y la yarda pasaron a tener una longitud fija. En Inglaterra, un pie eran 12 pulgadas y una yarda eran 3 pies." },
      { title: "Pulgares y pulgadas", text: "Una pulgada mide más o menos lo ancho del pulgar de un adulto: ¡en español, «pulgada» viene de «pulgar»! En inglés se dice «inch», de una palabra latina que significa «la doceava parte», porque 12 pulgadas forman un pie." },
      { title: "Separa y multiplica", text: "Para calcular 14 × 3, separa el 14 en 10 y 4: 10 × 3 = 30 y 4 × 3 = 12, así que 14 × 3 = 42." }
    ],
    quiz: [
      { q: "Un pie son 12 pulgadas. ¿Cuántas pulgadas hay en 3 pies?", choices: ["15", "36", "32"], hint: "12 × 3: prueba con 10 × 3 y 2 × 3.", explain: "10 × 3 = 30 y 2 × 3 = 6, así que son 36 pulgadas." },
      { q: "Una muralla mide 24 pies de largo. ¿Cuánto miden 4 murallas como esa, una detrás de otra?", choices: ["96 pies", "28 pies", "86 pies"], hint: "20 × 4 y 4 × 4.", explain: "20 × 4 = 80 y 4 × 4 = 16. 80 + 16 = 96 pies." },
      { q: "Una yarda son 3 pies. ¿Cuántos pies son 15 yardas?", choices: ["18", "35", "45"], hint: "10 × 3 y 5 × 3.", explain: "10 × 3 = 30 y 5 × 3 = 15, así que son 45 pies." },
      { q: "¿Por qué los pueblos guardaban varas de medir oficiales?", choices: ["Para que todos usaran las mismas medidas", "Para remover la sopa", "Para tocar las campanas"], hint: "Cada persona tiene los pies de un tamaño distinto.", explain: "Con una vara oficial para comprobar, el pie o la yarda de todos medía lo mismo, y así comprar y construir era justo." },
      { q: "Un cantero corta 16 piedras al día. ¿Cuántas corta en 5 días?", choices: ["21", "80", "70", "56"], hint: "10 × 5 y 6 × 5.", explain: "10 × 5 = 50 y 6 × 5 = 30. 50 + 30 = 80 piedras." }
    ]
  },
  'm4-castle-feast-sharing': {
    title: "Repartir el banquete del castillo", topicName: "División", blurb: "Reparte de forma justa empanadas, pan y bancos en el banquete del gran salón.",
    reading: [
      { title: "Un banquete en el gran salón", text: "Los días de fiesta, la gente del castillo comía junta en el gran salón, en mesas largas, con música y cuentos." },
      { title: "Repartir de forma justa", text: "Dividir es repartir en grupos iguales. 12 empanadas repartidas entre 4 mesas son 12 ÷ 4 = 3 empanadas en cada mesa." },
      { title: "Las tablas ayudan", text: "Dividir es multiplicar al revés. 4 × 3 = 12, así que 12 ÷ 4 = 3." },
      { title: "Lo que sobra", text: "A veces las cosas no se reparten exactas. 13 empanadas en 4 mesas son 3 para cada una, y sobra 1. Lo que sobra se llama resto." }
    ],
    quiz: [
      { q: "Se reparten 24 panecillos entre 6 mesas. ¿Cuántos hay en cada mesa?", choices: ["4", "18", "30"], hint: "¿6 × cuánto = 24?", explain: "6 × 4 = 24, así que hay 4 panecillos en cada mesa." },
      { q: "35 invitados se sientan en bancos de 5 personas. ¿Cuántos bancos hacen falta?", choices: ["30", "7", "40"], hint: "¿Cuántos cincos hay en 35?", explain: "5 × 7 = 35, así que hacen falta 7 bancos." },
      { q: "Se ponen 18 manzanas en 3 cestas a partes iguales. ¿Cuántas hay en cada una?", choices: ["15", "21", "6"], hint: "¿3 × cuánto = 18?", explain: "3 × 6 = 18, así que hay 6 manzanas en cada cesta." },
      { q: "Se reparten 13 empanadas entre 4 mesas a partes iguales. ¿Cuántas sobran?", choices: ["1", "3", "0"], hint: "4 × 3 = 12.", explain: "Cada mesa recibe 3 empanadas (12 en total) y sobra 1 empanada." },
      { q: "¿Qué multiplicación ayuda a calcular 42 ÷ 7?", choices: ["7 × 6 = 42", "7 + 6 = 13", "42 − 7 = 35"], hint: "Dividir es multiplicar al revés.", explain: "7 × 6 = 42, así que 42 ÷ 7 = 6." }
    ]
  },

  // ── Calle 5: Jardín del Reloj de Sol ──
  'm5-castle-walls-gardens': {
    title: "Murallas y huertos de hierbas", topicName: "Área y perímetro", blurb: "Da la vuelta a las murallas del castillo para hallar el perímetro, y planta arriates de hierbas para hallar el área.",
    reading: [
      { title: "Alrededor de las murallas", text: "Los guardias caminaban por lo alto de las murallas del castillo. La distancia de toda la vuelta a una figura se llama perímetro." },
      { title: "Jardines dentro", text: "Los castillos tenían jardines con hierbas aromáticas, flores y verduras. El espacio de dentro de un arriate es su área, y se mide en metros cuadrados." },
      { title: "Rectángulos", text: "En un rectángulo de 8 m de largo y 3 m de ancho, el perímetro es 8 + 3 + 8 + 3 = 22 m, y el área es 8 × 3 = 24 metros cuadrados." }
    ],
    quiz: [
      { q: "Un patio mide 10 m de largo y 6 m de ancho. ¿Cuál es su perímetro?", choices: ["32 m", "60 m", "16 m"], hint: "Suma los cuatro lados.", explain: "10 + 6 + 10 + 6 = 32 m." },
      { q: "Un arriate de hierbas mide 5 m de largo y 4 m de ancho. ¿Cuál es su área?", choices: ["9 metros cuadrados", "20 metros cuadrados", "18 metros cuadrados"], hint: "Multiplica largo × ancho.", explain: "5 × 4 = 20 metros cuadrados." },
      { q: "Una torre cuadrada mide 7 m en cada lado. ¿Cuánto mide toda la vuelta?", choices: ["14 m", "49 m", "28 m"], hint: "Un cuadrado tiene 4 lados iguales.", explain: "4 × 7 = 28 m." },
      { q: "Cada rosal necesita 1 metro cuadrado. ¿Cuántos caben en un arriate de 6 m de largo y 3 m de ancho?", choices: ["18", "9", "12"], hint: "Halla el área del arriate.", explain: "6 × 3 = 18 metros cuadrados, así que caben 18 rosales." },
      { q: "¿Qué te dice cuánta valla necesitas para rodear un jardín?", choices: ["El área", "El perímetro", "La altura"], hint: "«Peri» significa «alrededor».", explain: "El perímetro es la distancia alrededor del borde, así que te dice cuánto tiene que medir la valla." }
    ]
  },
  'm5-castle-banner-decimals': {
    title: "Estandartes y cintas en décimas", topicName: "Decimales", blurb: "Mide estandartes y cintas del mayo en metros y décimas.",
    reading: [
      { title: "Entre los metros", text: "Los estandartes no siempre miden un número entero de metros. Un estandarte de 1,5 m mide 1 metro entero y 5 décimas más." },
      { title: "Décimas", text: "Corta un metro en 10 partes iguales y cada parte es una décima: 0,1 m, que son 10 cm." },
      { title: "Sumar decimales", text: "Pon las comas una debajo de la otra. 2,4 m de cinta roja y 1,3 m de cinta azul son 3,7 m de cinta." },
      { title: "Comparar", text: "Para comparar 2,6 y 2,9, mira primero las unidades enteras. Las dos son 2, así que mira las décimas: 9 décimas es más que 6 décimas." }
    ],
    quiz: [
      { q: "¿Qué estandarte es más largo: el de 2,6 m o el de 2,9 m?", choices: ["2,6 m", "2,9 m"], hint: "Las unidades enteras son iguales, así que compara las décimas.", explain: "9 décimas es más que 6 décimas, así que 2,9 m es más largo." },
      { q: "¿Qué significa 3,4?", choices: ["3 unidades y 4 décimas", "34 unidades", "3 unidades y 4 centenas"], hint: "La cifra que va después de la coma son las décimas.", explain: "3,4 son 3 unidades y 4 décimas." },
      { q: "Se atan una cinta de 1,5 m y otra de 2,3 m. ¿Cuánto miden juntas?", choices: ["3,5 m", "38 m", "3,8 m"], hint: "Suma las unidades y luego las décimas.", explain: "1 + 2 = 3 y 0,5 + 0,3 = 0,8, así que miden 3,8 m." },
      { q: "Un estandarte mide 4,7 m. Se cortan 1,2 m. ¿Cuánto mide ahora?", choices: ["3,5 m", "5,9 m", "3,7 m"], hint: "4 − 1, y luego 0,7 − 0,2.", explain: "4 − 1 = 3 y 0,7 − 0,2 = 0,5, así que mide 3,5 m." },
      { q: "¿Cuántas décimas forman una unidad entera?", choices: ["5", "100", "10", "1"], hint: "Corta un metro en décimas iguales.", explain: "10 décimas forman 1 unidad entera." }
    ]
  },

  // ── Calle 6: Bastión de los Globos ──
  'm6-castle-cold-heights': {
    title: "Más frío allá arriba", topicName: "Números negativos", blurb: "Cuanto más alto subes, más frío está el aire. Cuenta bajo cero mientras subes al Castillo del Cielo.",
    reading: [
      { title: "Más frío al subir", text: "El aire se enfría cuanto más alto subes: unos 6 o 7 grados menos por cada 1000 metros. Por eso las montañas altas pueden tener nieve en la cima, incluso en verano." },
      { title: "Bajo cero", text: "Las temperaturas por debajo de 0 °C son números negativos. −8 °C es más frío que −3 °C, porque está más por debajo de cero." },
      { title: "Hasta el Castillo del Cielo", text: "Si junto al río hace 12 °C y el Castillo del Cielo flota a 3000 metros de altura, allí podría hacer unos 20 grados menos: unos −8 °C. ¡Abrígate bien!" },
      { title: "Usa la recta numérica", text: "Para bajar 9 grados desde 5 °C, cuenta 5 hacia abajo hasta llegar a 0, y luego 4 más: −4 °C." }
    ],
    quiz: [
      { q: "¿Qué temperatura es más fría: −12 °C o −5 °C?", choices: ["−12 °C", "−5 °C"], hint: "Cuanto más por debajo de cero, más frío.", explain: "−12 °C está 12 grados bajo cero: es más frío que −5 °C." },
      { q: "Hace 4 °C y la temperatura baja 10 grados. ¿Qué temperatura hace ahora?", choices: ["6 °C", "−6 °C", "−14 °C"], hint: "Baja 4 para llegar a 0 y luego sigue.", explain: "De 4 bajas hasta 0, y luego 6 más: −6 °C." },
      { q: "Por la noche hace −7 °C y a mediodía hace 5 °C. ¿Cuál es la diferencia?", choices: ["2 grados", "12 grados", "−2 grados"], hint: "De −7 sube hasta 0 y luego hasta 5.", explain: "7 + 5 = 12 grados." },
      { q: "Más o menos, ¿cuánto se enfría el aire por cada 1000 m que subes?", choices: ["Unos 6 o 7 grados", "Unos 50 grados", "Se calienta"], hint: "Lo bastante para que haya nieve en las montañas altas.", explain: "El aire se enfría unos 6 o 7 grados por cada 1000 m que subes." },
      { q: "El termómetro marca −9 °C. La temperatura sube 4 grados. ¿Qué marca ahora?", choices: ["−13 °C", "−5 °C", "5 °C", "13 °C"], hint: "Calentarse quiere decir acercarse al cero.", explain: "−9 + 4 = −5 °C." }
    ]
  },
  'm6-castle-fair-percent': {
    title: "Porcentajes en la feria del castillo", topicName: "Porcentajes", blurb: "Gangas, premios y multitudes: calcula porcentajes en la feria de verano del castillo.",
    reading: [
      { title: "De cada 100", text: "Por ciento quiere decir «de cada 100». El 50% es la mitad, el 25% es un cuarto y el 10% es una décima parte." },
      { title: "Día de feria", text: "Muchos pueblos de la Edad Media celebraban una gran feria una vez al año, con malabaristas, música y comerciantes que traían telas, especias y tesoros de muy lejos." },
      { title: "Calcular el 10%", text: "Para calcular el 10%, divide entre 10. El 10% de 80 monedas son 8 monedas. Para el 20%, calcula el doble: 16 monedas." },
      { title: "Rebajas", text: "Si un puesto rebaja un 25% una capa de 40 monedas, cuesta 10 monedas menos: 30 monedas." }
    ],
    quiz: [
      { q: "¿Cuánto es el 10% de 60 monedas?", choices: ["6 monedas", "50 monedas", "600 monedas"], hint: "Divide entre 10.", explain: "60 ÷ 10 = 6 monedas." },
      { q: "Un malabarista deja caer la pelota 3 veces de cada 100 lanzamientos. ¿Qué porcentaje de lanzamientos se le cayó?", choices: ["30%", "3%", "97%"], hint: "Por ciento quiere decir de cada 100.", explain: "3 de cada 100 es el 3%." },
      { q: "Una capa cuesta 20 monedas. El puesto la rebaja un 50%. ¿Cuánto cuesta ahora?", choices: ["15 monedas", "40 monedas", "10 monedas"], hint: "El 50% es la mitad.", explain: "La mitad de 20 es 10, así que cuesta 10 monedas." },
      { q: "A la feria van 200 personas, y el 25% son niños. ¿Cuántos niños son?", choices: ["50", "25", "75"], hint: "El 25% es un cuarto.", explain: "Un cuarto de 200 son 50 niños." },
      { q: "Se han comido el 30% de una empanada. ¿Qué porcentaje queda?", choices: ["30%", "70%", "130%", "3%"], hint: "La empanada entera es el 100%.", explain: "100% − 30% = 70%. Queda el 70%." }
    ]
  },

  // ── Calle 7: Jardín de la Corona ──
  'm7-castle-clockwork-equations': {
    title: "Ecuaciones de relojería", topicName: "Ecuaciones de dos pasos", blurb: "Resuelve los acertijos del relojero sobre engranajes y campanas deshaciendo dos pasos.",
    reading: [
      { title: "Dentro del reloj", text: "Una torre del reloj está llena de engranajes: ruedas con dientes que se hacen girar unas a otras. Los relojeros cuentan los dientes para que cada aguja gire justo a la velocidad correcta." },
      { title: "Dos pasos", text: "En 4x + 6 = 30, un número misterioso x se multiplicó por 4 y luego se le sumó 6. Para hallar x, deshaz los pasos en orden inverso." },
      { title: "Deshacer, deshacer", text: "Resta 6 en los dos lados: 4x = 24. Luego divide los dos lados entre 4: x = 6. Compruébalo: 4 × 6 + 6 = 30 ✓." }
    ],
    quiz: [
      { q: "Resuelve 5x + 4 = 39.", choices: ["7", "8", "43"], hint: "Resta 4 y luego divide entre 5.", explain: "5x = 35, así que x = 7. Comprobación: 5 × 7 + 4 = 39." },
      { q: "Un engranaje tiene x dientes. Tres engranajes como ese y uno de 12 dientes tienen 72 dientes en total: 3x + 12 = 72. ¿Cuánto vale x?", choices: ["24", "20", "28"], hint: "Resta 12 y luego divide entre 3.", explain: "3x = 60, así que x = 20 dientes." },
      { q: "Resuelve 7x − 5 = 51.", choices: ["6", "7", "8"], hint: "Suma 5 y luego divide entre 7.", explain: "7x = 56, así que x = 8. Comprobación: 7 × 8 − 5 = 51." },
      { q: "Una campana suena x veces cada hora. En 6 horas, más 2 toques extra por una boda, suena 26 veces: 6x + 2 = 26. ¿Cuánto vale x?", choices: ["4", "5", "3", "6"], hint: "Resta 2 y luego divide entre 6.", explain: "6x = 24, así que x = 4 toques por hora." },
      { q: "¿Cuál es el primer paso para resolver 2x + 9 = 25?", choices: ["Restar 9 en los dos lados", "Dividir 25 entre 9", "Sumar 2 en los dos lados"], hint: "Deshaz lo último que se le hizo a x.", explain: "Resta 9 en los dos lados para obtener 2x = 16, y luego divide entre 2: x = 8." }
    ]
  },
  'm7-castle-fibonacci': {
    title: "Los cuadrados y las espirales de Fibonacci", topicName: "Cuadrados y raíces", blurb: "Conoce la famosa secuencia de números de Fibonacci y construye una espiral con cuadrados.",
    reading: [
      { title: "El libro de Fibonacci", text: "En 1202, Leonardo de Pisa, conocido como Fibonacci, terminó un libro llamado Liber Abaci. Ayudó a la gente de Europa a usar las cifras del 0 al 9, que llegaron de la India a través del mundo árabe, en lugar de los números romanos." },
      { title: "Una secuencia famosa", text: "Su libro tiene un acertijo sobre conejos que da la secuencia 1, 1, 2, 3, 5, 8, 13, 21… Cada número es la suma de los dos anteriores." },
      { title: "Cuadrados en espiral", text: "Dibuja cuadrados de lados 1, 1, 2, 3, 5 y 8, y encajan formando un rectángulo de 8 por 13. Sus áreas son números cuadrados: 1, 1, 4, 9, 25 y 64." },
      { title: "Raíces cuadradas", text: "La raíz cuadrada deshace el cuadrado: √64 = 8, porque 8 × 8 = 64. Así que un cuadrado con un área de 64 tiene lados de 8." }
    ],
    quiz: [
      { q: "¿Qué número va después: 1, 1, 2, 3, 5, 8, 13, …?", choices: ["21", "18", "26"], hint: "Suma los dos números anteriores.", explain: "8 + 13 = 21." },
      { q: "Un cuadrado de la espiral tiene lados de 13. ¿Cuál es su área?", choices: ["26", "169", "139"], hint: "13 × 13", explain: "13² = 13 × 13 = 169." },
      { q: "Un cuadrado de baldosas tiene un área de 121. ¿Cuánto mide cada lado?", choices: ["12", "60,5", "11"], hint: "¿Qué número multiplicado por sí mismo da 121?", explain: "11 × 11 = 121, así que cada lado mide 11." },
      { q: "¿Entre qué dos números enteros está √30?", choices: ["Entre 5 y 6", "Entre 4 y 5", "Entre 6 y 7"], hint: "5² = 25 y 6² = 36.", explain: "25 < 30 < 36, así que √30 está entre 5 y 6." },
      { q: "¿Qué empezó a usar la gente de Europa gracias al libro de Fibonacci?", choices: ["Los números romanos", "Las cifras del 0 al 9", "Los relojes"], hint: "Las cifras con las que escribimos los números hoy.", explain: "El Liber Abaci ayudó a extender las cifras del 0 al 9, que llegaron de la India a través del mundo árabe." }
    ]
  },

  // ───────── La Sala de la Biblioteca (Historia) ─────────
  // ── Calle 1: Mercado de la Puerta ──
  'h1-castle-market-day': {
    title: "Día de mercado en el pueblo del castillo",
    topicName: "Los pueblos con mercado de la Edad Media",
    blurb: "Ayuda a una panadera en un mercado medieval lleno de gente: pan, huevos, lana y las campanas de la iglesia.",
    reading: [
      { title: "Pueblos junto al castillo", text: "Hace mucho tiempo, muchos pueblos crecieron al lado de los castillos. La gente iba a vivir allí, a trabajar y a comerciar." },
      { title: "Día de mercado", text: "Una vez a la semana, el pueblo tenía mercado. Los granjeros traían huevos, queso, lana y verduras, y los panaderos vendían pan." },
      { title: "Reglas justas", text: "Había reglas para que el mercado fuera justo. Una hogaza de pan tenía que pesar lo que tocaba, y se revisaban las pesas de los comerciantes." },
      { title: "Campanas para la hora", text: "Casi nadie tenía reloj. Las campanas de la iglesia sonaban para avisar a todos de cuándo abrir el mercado, rezar o dejar de trabajar." }
    ],
    dialogue: {
      npc: { name: "Agnes", role: "una panadera del mercado del castillo" },
      intro: "¡Buenos días, pequeño! ¡Cuidado con la harina! Hoy es día de mercado y mis bollos todavía están calentitos. ¿Quieres que te cuente cómo es nuestro mercado?",
      topics: [
        { ask: "¿Qué puede comprar la gente aquí?", answer: "¡Uy, de todo! Huevos y queso de las granjas, lana y telas, ollas y zapatos, pescado y manzanas. Y mi pan, claro: ¡el mejor del pueblo!" },
        { ask: "¿Cómo paga la gente?", answer: "Con monedas pequeñitas de plata. Algunos cambian unas cosas por otras: una cesta de huevos por un par de zapatos, o una gallina por un poco de tela." },
        { ask: "¿Por qué pones un sello en tus panes?", answer: "Cada panadero pone su propia marca en su pan. Si una hogaza es demasiado pequeña, ¡todo el mundo sabe de quién es! El pueblo comprueba que los panes pesen lo que tienen que pesar." },
        { ask: "¿Cómo sabes cuándo abrir?", answer: "¡Escucho la campana de la iglesia! Cuando suena por la mañana, abre el mercado. Cuando vuelve a sonar por la tarde, recogemos y nos vamos a casa." },
        { ask: "¿También hay una feria grande?", answer: "¡Una vez al año! Vienen comerciantes de muy lejos con especias y seda, y hay malabaristas, juglares y teatro de títeres. Aquí, en el Castillo del Cielo, ¡hasta las cabras bailan!" }
      ],
      challenge: {
        q: "¿Por qué los panaderos ponían su propia marca en el pan?",
        choices: ["Para que supiera más dulce", "Para que todos supieran quién había hecho cada hogaza", "Para espantar a los pájaros"],
        explain: "La marca del panadero mostraba quién había hecho cada hogaza, y así el pueblo podía comprobar que el pan era justo."
      },
      farewell: "¡Hala, ve, y llévate un bollo calentito para el camino! Vuelve el próximo día de mercado."
    },
    timeline: {
      title: "Mercados y ferias de hace mucho tiempo",
      events: [
        { label: "Por toda Europa aparecen muchos pueblos y mercados nuevos", when: "hace unos 900 años" },
        { label: "Las grandes ferias anuales de Champaña, en Francia, atraen a comerciantes de muy lejos", when: "hace unos 800 años" },
        { label: "Una ley de Inglaterra fija cuánto debe pesar una hogaza de pan", when: "1266" },
        { label: "Empiezan a aparecer relojes con campanas en las torres de los pueblos", when: "hace unos 700 años" }
      ]
    },
    artifact: {
      name: "La balanza de un comerciante",
      text: "Los comerciantes pesaban especias, plata y lana en balanzas como esta. Los funcionarios del pueblo revisaban las pesas para que todos recibieran un trato justo."
    },
    quiz: [
      { q: "¿Cada cuánto tenían mercado la mayoría de los pueblos?", choices: ["Una vez a la semana", "Una vez cada diez años", "Nunca"], hint: "Llegaba a menudo, como un día de la semana.", explain: "La mayoría de los pueblos tenía mercado una vez a la semana." },
      { q: "¿Qué llevaban los granjeros al mercado?", choices: ["Robots", "Huevos, queso, lana y verduras", "Bicicletas"], hint: "Cosas de la granja.", explain: "Los granjeros llevaban huevos, queso, lana y verduras para vender." },
      { q: "¿Cómo sabía la hora casi toda la gente?", choices: ["Por el móvil", "Por el reloj de pulsera", "Escuchando las campanas de la iglesia"], hint: "Casi nadie tenía reloj.", explain: "Las campanas de la iglesia sonaban para decirle a todo el mundo la hora." },
      { q: "¿Por qué se revisaban las pesas de los comerciantes?", choices: ["Para que el mercado fuera justo", "Para que el pan pesara más", "Para parar las campanas"], hint: "Nadie debía ser engañado.", explain: "Revisar las pesas aseguraba que todos recibieran lo que habían pagado." },
      { q: "¿Qué pasaba una vez al año en muchos pueblos?", choices: ["Una gran feria con comerciantes de muy lejos", "Todos se mudaban de casa", "El castillo se iba volando"], hint: "¡También había malabaristas y música!", explain: "Una vez al año, muchos pueblos celebraban una gran feria, con comerciantes de muy lejos, malabaristas y música." }
    ]
  },
  'h1-castle-builders': {
    title: "¿Quién construyó los castillos?",
    topicName: "Construir castillos",
    blurb: "Conoce a un cantero y descubre cómo se construían los castillos sin ninguna máquina con motor.",
    reading: [
      { title: "¡Sin motores!", text: "Hace mucho tiempo no había camiones ni grúas con motor. Los castillos los construían cientos de personas trabajando juntas, con herramientas muy ingeniosas." },
      { title: "Canteros y carpinteros", text: "Los canteros cortaban y daban forma a las piedras con mazos y cinceles. Los carpinteros hacían armazones de madera, escaleras de mano y andamios." },
      { title: "Una rueda para subir piedras", text: "Para subir piedras pesadas muy alto, unos trabajadores caminaban dentro de una gran rueda de madera. La rueda, al girar, enrollaba una cuerda, como una rueda de hámster gigante." },
      { title: "Mortero pegajoso", text: "Los constructores pegaban las piedras con mortero, una pasta de cal, arena y agua que se ponía dura." }
    ],
    dialogue: {
      npc: { name: "Will", role: "un cantero" },
      intro: "¡Hola! Cuidado con los pies, que estas piedras pesan mucho. Soy cantero. ¿Quieres ver cómo construimos un castillo?",
      topics: [
        { ask: "¿Qué haces tú?", answer: "Corto las piedras en bloques bien rectos con mi mazo y mi cincel, toc, toc, toc, para que encajen bien unas encima de otras en la muralla." },
        { ask: "¿Cómo subís las piedras?", answer: "¡Con la grúa de rueda! Dos trabajadores caminan dentro de la rueda grande, y la cuerda se enrolla y levanta la piedra. Es lenta, pero funciona." },
        { ask: "¿Qué es esa marca de tu piedra?", answer: "¡Es mi marca de cantero! Muchos canteros tallan su propio signo pequeñito en las piedras que cortan. Todavía hoy puedes encontrar marcas así en castillos antiguos." },
        { ask: "¿Cuánto se tarda en hacer un castillo?", answer: "¡Depende! Algunos castillos se construyeron en pocos años con muchos trabajadores. Los grandes podían tardar muchos años, y algunos nunca se terminaron del todo." },
        { ask: "¿Alguien construye castillos así hoy?", answer: "¡Sí! En Guédelon, en Francia, llevan construyendo un castillo desde 1997 solo con las herramientas y las técnicas de antes, para aprender cómo se hacía." }
      ],
      challenge: {
        q: "¿Cómo subían los trabajadores las piedras pesadas tan alto?",
        choices: ["Con una grúa de rueda", "Con un helicóptero", "Con magia"],
        explain: "Los trabajadores caminaban dentro de una gran rueda de madera, que enrollaba una cuerda para subir las piedras."
      },
      farewell: "¡Gracias por visitar la obra! La próxima vez que veas un castillo antiguo, busca las marcas de los canteros."
    },
    timeline: {
      title: "Construir castillos",
      events: [
        { label: "Se construyen castillos de madera sobre montículos altos de tierra", when: "hace unos 1000 años" },
        { label: "Se empieza a construir la gran Torre Blanca de piedra en Londres", when: "hacia 1078" },
        { label: "El castillo de Conwy, en Gales, se construye en solo unos cuatro años", when: "1283" },
        { label: "En Guédelon, Francia, empiezan un castillo con herramientas de hace mucho tiempo", when: "1997" }
      ]
    },
    artifact: {
      name: "Una grúa de rueda",
      text: "Los trabajadores caminaban dentro de la gran rueda de madera para hacerla girar. La rueda enrollaba una cuerda que subía las piedras pesadas hasta lo alto de las murallas."
    },
    quiz: [
      { q: "¿Quién cortaba y daba forma a las piedras de un castillo?", choices: ["Los panaderos", "Los canteros", "Los caballeros"], hint: "Usaban mazos y cinceles.", explain: "Los canteros cortaban y daban forma a las piedras." },
      { q: "¿Qué hacían los carpinteros?", choices: ["Armazones de madera, escaleras de mano y andamios", "Ventanas de cristal", "Murallas de piedra"], hint: "Los carpinteros trabajan la madera.", explain: "Los carpinteros hacían los armazones de madera, las escaleras de mano y los andamios." },
      { q: "¿Qué es el mortero?", choices: ["Un tipo de sombrero", "Una pasta que pega las piedras", "Un perro del castillo"], hint: "Se pone duro entre las piedras.", explain: "El mortero es una pasta de cal, arena y agua que pega las piedras." },
      { q: "¿Cómo funcionaba una grúa de rueda?", choices: ["Quemaba carbón", "Usaba electricidad", "La gente caminaba dentro de la rueda para hacerla girar"], hint: "Como una rueda de hámster gigante.", explain: "La gente caminaba dentro de la rueda, y esta enrollaba una cuerda para subir las piedras." },
      { q: "¿Qué es una marca de cantero?", choices: ["Un signo pequeñito que un cantero tallaba en sus piedras", "Una huella sucia", "Un mapa del castillo"], hint: "Todavía se encuentran en castillos antiguos.", explain: "Muchos canteros tallaban su propio signo pequeñito en las piedras que cortaban." }
    ]
  },

  // ── Calle 2: Calle de las Cintas ──
  'h2-castle-white-heron': {
    title: "Himeji, el castillo de la Garza Blanca",
    topicName: "Los castillos de Japón",
    blurb: "Visita un castillo blanco y reluciente de Japón que parece un pájaro a punto de echar a volar.",
    reading: [
      { title: "Un pájaro blanco", text: "El castillo de Himeji, en Japón, es tan blanco y elegante que lo llaman el castillo de la Garza Blanca. Parece una garza que abre las alas para volar." },
      { title: "Madera y yeso", text: "El castillo está hecho de madera sobre una base alta de piedra. Sus paredes están cubiertas de una capa gruesa de yeso blanco, que ayuda a proteger la madera del fuego." },
      { title: "Peces dorados en el tejado", text: "En los tejados hay peces con cabeza de tigre, llamados shachihoko. La gente creía que protegían el castillo del fuego." },
      { title: "Todavía en pie", text: "Su gran torre principal se terminó en 1609, hace más de 400 años. Hoy es uno de los castillos antiguos mejor conservados de Japón, y vienen a verlo visitantes de todo el mundo." }
    ],
    dialogue: {
      npc: { name: "Haru", role: "un yesero que mantiene blancas las paredes del castillo" },
      intro: "¡Konnichiwa! Bienvenido a Himeji. Soy yesero: ayudo a que estas paredes sigan tan blancas como las plumas de una garza. ¿Te enseño el castillo?",
      topics: [
        { ask: "¿Por qué es blanco el castillo?", answer: "Las paredes están cubiertas de una capa gruesa de yeso blanco hecho con cal. Brilla al sol y ayuda a que el fuego no llegue a las paredes de madera de dentro." },
        { ask: "¿Por qué los caminos tienen tantas curvas?", answer: "Los caminos que suben a la torre principal dan vueltas y vueltas como un laberinto. ¡A los visitantes de hoy les encanta perderse un poquito!" },
        { ask: "¿Qué son los peces del tejado?", answer: "Son shachihoko: peces con cabeza de tigre. Hace mucho tiempo, la gente creía que podían llamar al agua para proteger el castillo del fuego." },
        { ask: "¿Cuántos pisos tiene?", answer: "Desde fuera, parece que la torre principal tiene cinco pisos. ¡Pero dentro hay todavía más, y además un sótano! Qué ingenioso, ¿verdad?" },
        { ask: "¿Lo volvéis a pintar alguna vez?", answer: "¡Sí! Hace poco, unos trabajadores pasaron unos cinco años arreglando los tejados y las paredes con yeso nuevo. Cuando terminaron, en 2015, el castillo brillaba tanto que algunos lo llamaron el castillo «demasiado blanco»." }
      ],
      challenge: {
        q: "¿Por qué a Himeji lo llaman el castillo de la Garza Blanca?",
        choices: ["Porque lo construyeron unas garzas", "Porque es blanco y elegante, como una garza que echa a volar", "Porque está hecho de plumas"],
        explain: "Sus paredes blancas y sus tejados curvos parecen una garza blanca que abre las alas."
      },
      farewell: "¡Sayonara! Si alguna vez vas a Japón, mira hacia arriba y saluda a los peces dorados del tejado."
    },
    timeline: {
      title: "El castillo de la Garza Blanca",
      events: [
        { label: "Se construye un fuerte pequeño en la colina de Himeji", when: "1346" },
        { label: "Se termina la gran torre principal", when: "1609" },
        { label: "El castillo de Himeji pasa a ser Patrimonio de la Humanidad", when: "1993" },
        { label: "Terminan grandes reparaciones y el castillo vuelve a brillar de blanco", when: "2015" }
      ]
    },
    artifact: {
      name: "Un shachihoko dorado",
      text: "Adornos de tejado con forma de pez con cabeza de tigre y la cola bien levantada. La gente creía que protegían el castillo del fuego."
    },
    quiz: [
      { q: "¿En qué país está el castillo de Himeji?", choices: ["Japón", "Francia", "Egipto"], hint: "¡Konnichiwa!", explain: "El castillo de Himeji está en Japón." },
      { q: "¿Qué cubre las paredes del castillo?", choices: ["Oro", "Una capa gruesa de yeso blanco", "Hierba"], hint: "Hace que estén blancas.", explain: "Las paredes están cubiertas de una capa gruesa de yeso blanco." },
      { q: "¿Qué es un shachihoko?", choices: ["Un tipo de espada", "Un cocinero del castillo", "Un adorno de tejado: un pez con cabeza de tigre"], hint: "¡Mira hacia el tejado!", explain: "Los shachihoko son adornos de tejado con forma de pez con cabeza de tigre." },
      { q: "¿De qué ayudaba a proteger el yeso blanco al castillo de madera?", choices: ["Del fuego", "De los pájaros", "De la nieve"], hint: "La madera arde con facilidad.", explain: "La capa gruesa de yeso ayuda a proteger del fuego las paredes de madera." },
      { q: "¿Cuándo se terminó la gran torre principal?", choices: ["El año pasado", "En 1609, hace más de 400 años", "Hace 10 000 años"], hint: "Hace más de 400 años.", explain: "La torre principal se terminó en 1609." }
    ]
  },
  'h2-castle-hangul': {
    title: "El alfabeto del rey Sejong",
    topicName: "El hangul, el alfabeto coreano",
    blurb: "Descubre cómo un rey bondadoso creó un alfabeto para que todo el mundo en Corea pudiera leer y escribir.",
    reading: [
      { title: "Difícil de escribir", text: "Hace mucho tiempo, en Corea se escribía con caracteres chinos. Había que aprender miles de ellos, así que casi toda la gente sencilla no sabía leer ni escribir." },
      { title: "Un rey que se preocupaba", text: "El rey Sejong quería que todo el mundo pudiera leer y escribir. En 1443 creó un alfabeto totalmente nuevo para el idioma coreano: el hangul." },
      { title: "Letras con forma de boca", text: "Algunas letras del hangul se dibujan con la forma que tienen la boca o la lengua al hacer el sonido. ㅁ (m) parece unos labios cerrados, y ㄱ (g) muestra la parte de atrás de la lengua." },
      { title: "Fácil de aprender", text: "El hangul tiene pocas letras, así que se aprende rápido. Hoy los coreanos lo celebran cada año en el Día del Hangul." }
    ],
    dialogue: {
      npc: { name: "Min-jun", role: "un joven sabio de la corte del rey Sejong" },
      intro: "¡Annyeong! Bienvenido a la biblioteca del palacio. Ayudo a los sabios de la corte del rey Sejong. ¿Quieres que te hable de las maravillosas letras nuevas de nuestro rey?",
      topics: [
        { ask: "¿Por qué el rey hizo letras nuevas?", answer: "Nuestro rey vio que los granjeros, los cocineros y los niños no podían escribir sus propias palabras. Los caracteres chinos tardaban años en aprenderse. Él quería letras que cualquiera pudiera aprender rápido." },
        { ask: "¿Qué forma tienen las letras?", answer: "Algunas letras muestran la forma de la boca o de la lengua cuando dices el sonido. Di «mmm» y mírate en un espejo: tus labios forman una cajita, ¡igual que ㅁ!" },
        { ask: "¿Y las vocales?", answer: "Las vocales se forman con tres trazos sencillos: un punto para el cielo, una línea tumbada para la tierra y una línea de pie para las personas. Júntalos, ¡y puedes hacer todas las vocales!" },
        { ask: "¿En cuánto tiempo se aprenden?", answer: "Dicen que una persona lista puede aprenderlas en una mañana, y que cualquiera puede aprenderlas en diez días. ¿Quieres probar?" },
        { ask: "¿Qué más hizo el rey Sejong?", answer: "¡Muchísimas cosas! También le encantaba la ciencia. En su época, en Corea se fabricaron pluviómetros para medir la lluvia, y relojes de sol y relojes de agua muy ingeniosos para saber la hora." }
      ],
      challenge: {
        q: "¿Por qué el rey Sejong creó el hangul?",
        choices: ["Para que todo el mundo pudiera leer y escribir", "Para que escribir fuera más difícil", "Para escribir mensajes secretos"],
        explain: "Quería que todo su pueblo, y no solo unos pocos sabios, pudiera leer y escribir."
      },
      farewell: "¡Annyeonghi gaseyo! ¡Adiós! Algún día, intenta escribir tu nombre en hangul."
    },
    timeline: {
      title: "El rey Sejong y el hangul",
      events: [
        { label: "Sejong se convierte en rey de Joseon (Corea)", when: "1418" },
        { label: "Se fabrican pluviómetros para medir la lluvia en todo el país", when: "1441" },
        { label: "El rey Sejong crea el hangul", when: "1443" },
        { label: "El hangul se da a conocer al pueblo en un libro llamado Hunminjeongeum", when: "1446" },
        { label: "El libro Hunminjeongeum entra en el registro Memoria del Mundo de la UNESCO", when: "1997" }
      ]
    },
    artifact: {
      name: "El libro Hunminjeongeum",
      text: "El libro que dio a conocer el hangul al pueblo. Su nombre significa «los sonidos correctos para enseñar al pueblo». Explica cómo se creó cada letra."
    },
    quiz: [
      { q: "¿Quién creó el hangul?", choices: ["El rey Sejong", "Un pirata", "Fibonacci"], hint: "Un rey bondadoso de Corea.", explain: "El rey Sejong creó el hangul en 1443." },
      { q: "¿Por qué casi nadie en Corea sabía leer y escribir antes del hangul?", choices: ["No había papel", "Los caracteres chinos tardaban muchísimo en aprenderse", "Leer estaba prohibido"], hint: "Había miles de caracteres.", explain: "Había que aprender miles de caracteres chinos, así que se tardaba años." },
      { q: "¿A qué se parece la letra ㅁ (m)?", choices: ["A un árbol", "A una estrella", "A unos labios cerrados, la forma de la boca al decir «mmm»"], hint: "Di «mmm» delante de un espejo.", explain: "ㅁ muestra la forma de los labios cerrados al hacer el sonido «mmm»." },
      { q: "¿En qué año creó el rey Sejong el hangul?", choices: ["1443", "1066", "1969"], hint: "Entre 1400 y 1500.", explain: "El hangul se creó en 1443 y se dio a conocer al pueblo en 1446." },
      { q: "¿Qué celebran los coreanos cada año en el Día del Hangul?", choices: ["La tarta de cumpleaños del rey", "Su alfabeto, el hangul", "La primera nevada"], hint: "¡Está en el nombre!", explain: "El Día del Hangul celebra el alfabeto coreano." }
    ]
  },

  // ── Calle 3: Patio del Dragón ──
  'h3-castle-elephant-clock': {
    title: "El reloj elefante de Al-Jazari",
    topicName: "Las máquinas de Al-Jazari",
    blurb: "Conoce a un ingeniero brillante de hace 800 años y su reloj con forma de elefante.",
    reading: [
      { title: "Un ingeniero ingenioso", text: "Ismail al-Jazari fue un ingeniero que trabajó para los gobernantes de Diyarbakır, una ciudad de lo que hoy es Turquía. Le encantaba diseñar y construir máquinas ingeniosas." },
      { title: "Un libro de máquinas", text: "En 1206 terminó un libro famoso, el Libro del conocimiento de los ingeniosos mecanismos. Muestra decenas de máquinas, con dibujos e instrucciones para que otros pudieran construirlas." },
      { title: "El reloj elefante", text: "Su diseño más famoso es un reloj con forma de elefante que lleva una torre en el lomo. Cada media hora, un pájaro silba, unas figuritas se mueven y suena un platillo." },
      { title: "El agua hace el trabajo", text: "Dentro del elefante, un cuenco con un agujerito flota en el agua. Poco a poco se llena y se hunde, y cuando llega al fondo tira de unas cuerdas que ponen en marcha el espectáculo. Luego vuelve a empezar." }
    ],
    dialogue: {
      npc: { name: "Ismail al-Jazari", role: "un ingeniero e inventor de máquinas ingeniosas" },
      intro: "¡La paz sea contigo, joven amigo! Pasa, pasa, y cuidado con los engranajes. Soy al-Jazari. ¿Te gustaría ver funcionar mi reloj elefante?",
      topics: [
        { ask: "¿Cómo sabe la hora tu reloj?", answer: "Un cuenquito con un agujero flota en un depósito de agua dentro del elefante. El agua va entrando gota a gota y, a la media hora, el cuenco se hunde. ¡Ese cuenco que se hunde tira de las cuerdas que lo ponen todo en movimiento!" },
        { ask: "¿Qué pasa cada media hora?", answer: "Una bola cae desde lo alto de la torre, un pájaro del tejado silba y gira, una figura toca un platillo y los dragones se balancean. Luego el cuenco vuelve a subir y empieza la siguiente media hora." },
        { ask: "¿Por qué un elefante?", answer: "Mi reloj junta ideas de muchas tierras: un elefante de la India, dragones de China, un pájaro como un ave fénix y una alfombra de Persia. ¡Las ideas viajan y crecen cuando la gente las comparte!" },
        { ask: "¿Qué otras máquinas hiciste?", answer: "Bombas para subir agua a los campos y jardines, máquinas musicales, ¡y hasta una figurita que te echa agua para lavarte las manos!" },
        { ask: "¿Por qué escribiste un libro?", answer: "¡Para que mis máquinas no se perdieran! Dibujé cada pieza y escribí cómo construirla. Incluso hay gente que ha vuelto a construir mi reloj elefante en nuestros días." }
      ],
      challenge: {
        q: "¿Qué hacía empezar el espectáculo del reloj elefante cada media hora?",
        choices: ["Un cuenco que se hundía en un depósito de agua", "Un elefante de verdad", "Una pila"],
        explain: "Un cuenco con un agujerito se llenaba de agua poco a poco y se hundía, tirando de las cuerdas que ponían en marcha el espectáculo."
      },
      farewell: "¡Que te vaya bien, joven ingeniero! Recuerda: dibuja tus ideas con cuidado, para que otros también puedan construirlas."
    },
    timeline: {
      title: "Relojes y máquinas ingeniosas",
      events: [
        { label: "Ctesibio construye relojes de agua en Alejandría, Egipto", when: "hace unos 2270 años" },
        { label: "Su Song termina una gran torre del reloj movida por agua en China", when: "hacia 1092" },
        { label: "Al-Jazari termina su Libro del conocimiento de los ingeniosos mecanismos", when: "1206" },
        { label: "En las torres de Europa aparecen relojes movidos por pesas que bajan", when: "hace unos 700 años" }
      ]
    },
    artifact: {
      name: "Una maqueta del reloj elefante",
      text: "Un elefante que lleva una torrecita, con un pájaro en el tejado y figuras que se mueven cada media hora. Dentro, un cuenco que se hunde en el agua lleva la cuenta del tiempo."
    },
    quiz: [
      { q: "¿Qué era al-Jazari?", choices: ["Un ingeniero que diseñaba máquinas", "Un marinero", "Un pintor"], hint: "Construía máquinas ingeniosas.", explain: "Al-Jazari era un ingeniero que diseñaba y construía máquinas." },
      { q: "¿Qué forma tenía su reloj más famoso?", choices: ["De dragón", "De elefante con una torre en el lomo", "De barco"], hint: "Un animal grande de la India.", explain: "Su reloj más famoso tenía forma de elefante con una torre en el lomo." },
      { q: "¿Qué medía el tiempo dentro del reloj elefante?", choices: ["Un péndulo", "La arena", "Un cuenco que se hundía poco a poco en el agua"], hint: "El agua entra gota a gota por un agujerito.", explain: "Un cuenco con un agujerito se llenaba de agua poco a poco y se hundía cada media hora." },
      { q: "¿Por qué escribió al-Jazari su libro?", choices: ["Para que otros también pudieran construir sus máquinas", "Para mantener sus máquinas en secreto", "Para aprender a leer"], hint: "Dibujó cada pieza.", explain: "Dibujó cada pieza y explicó cómo construirla, para que sus ideas no se perdieran." },
      { q: "¿En qué año terminó al-Jazari su libro?", choices: ["1206", "2006", "206"], hint: "Hace unos 800 años.", explain: "Terminó su libro de máquinas en 1206." }
    ]
  },
  'h3-castle-angkor': {
    title: "Angkor Wat, la ciudad templo",
    topicName: "Angkor Wat",
    blurb: "Explora un templo gigante de piedra en Camboya, con torres como capullos de loto y muros llenos de historias talladas.",
    reading: [
      { title: "Un templo gigante", text: "Angkor Wat, en Camboya, es el edificio religioso más grande del mundo. Lo construyó el pueblo jemer en el siglo XII, para el rey Suryavarman II." },
      { title: "Torres de loto", text: "Sus cinco torres tienen forma de capullo de loto. Representan el monte Meru, una montaña sagrada de las historias hindúes, y un foso ancho de agua rodea el templo como un mar." },
      { title: "Historias en piedra", text: "Sus muros están cubiertos de tallas: largas imágenes de historias antiguas y más de mil bailarinas llenas de gracia." },
      { title: "Arenisca por el río", text: "La piedra venía de unas colinas a más de 30 km. Seguramente los constructores llevaron los bloques pesados por canales y ríos, en balsas." }
    ],
    dialogue: {
      npc: { name: "Sokha", role: "una tallista de piedra de Angkor" },
      intro: "¡Sua s'dei! ¡Hola! Soy tallista de piedra. Llevo toda la mañana tallando bailarinas en estos muros. ¡Ven a ver el templo!",
      topics: [
        { ask: "¿Cuánto tardaron en construirlo?", answer: "¡Unos treinta años! Miles de constructores, tallistas y ayudantes trabajaron en él, piedra a piedra." },
        { ask: "¿Qué tallas?", answer: "¡Sobre todo historias! Largas imágenes de cuentos antiguos, reyes y su pueblo, y bailarinas llenas de gracia llamadas apsaras. Cada una tiene su propio peinado y sus joyas." },
        { ask: "¿Por qué hay agua alrededor?", answer: "El foso es como el gran mar que rodea la montaña sagrada de nuestras historias. Además, ayudaba a que el suelo de debajo del templo se mantuviera firme y estable." },
        { ask: "¿Cómo movíais piedras tan grandes?", answer: "Las llevábamos flotando en balsas por los canales y el río, y luego las arrastrábamos el último trozo del camino. Algunas piedras todavía tienen agujeritos donde se sujetaban unas clavijas para levantarlas." },
        { ask: "¿Sigue siendo un templo?", answer: "¡Sí! Primero fue un templo hindú, y más tarde se convirtió en un templo budista. Los monjes todavía rezan allí, ¡y hasta aparece en la bandera de Camboya!" }
      ],
      challenge: {
        q: "¿Qué forma tienen las torres de Angkor Wat?",
        choices: ["De capullos de loto", "De espadas", "De cucuruchos de helado"],
        explain: "Las cinco torres tienen forma de capullo de loto y representan el monte sagrado Meru."
      },
      farewell: "¡Orkun! ¡Gracias! Si algún día vienes, hazlo al amanecer, cuando las torres brillan rosas y doradas."
    },
    timeline: {
      title: "Angkor Wat",
      events: [
        { label: "Empieza la construcción para el rey Suryavarman II", when: "a principios del siglo XII" },
        { label: "Angkor Wat se termina tras unos treinta años", when: "hacia 1150" },
        { label: "Angkor Wat se va convirtiendo poco a poco en un templo budista", when: "hacia 1300" },
        { label: "Angkor pasa a ser Patrimonio de la Humanidad", when: "1992" }
      ]
    },
    artifact: {
      name: "Una maqueta de Angkor Wat",
      text: "Cinco torres de piedra con forma de capullo de loto, sobre terrazas escalonadas. La más alta está en el centro, igual que en el templo de verdad."
    },
    quiz: [
      { q: "¿En qué país está Angkor Wat?", choices: ["Camboya", "Italia", "México"], hint: "Aparece en la bandera de ese país.", explain: "Angkor Wat está en Camboya y aparece en la bandera camboyana." },
      { q: "¿Qué rodea Angkor Wat?", choices: ["Un bosque de hielo", "Un foso ancho de agua", "Un desierto"], hint: "Como un mar alrededor de una montaña sagrada.", explain: "Un foso ancho de agua rodea el templo." },
      { q: "¿Qué hay tallado en sus muros?", choices: ["Números de teléfono", "Nada de nada", "Largas imágenes de historias y bailarinas llenas de gracia"], hint: "Las hizo una tallista.", explain: "Los muros están cubiertos de historias talladas y de más de mil bailarinas." },
      { q: "¿Cómo se movieron seguramente las piedras pesadas?", choices: ["En balsas por canales y ríos", "En camión", "En globo"], hint: "Flotando, las cosas pesadas son más fáciles de mover.", explain: "Seguramente los constructores llevaron las piedras flotando en balsas por canales y ríos." },
      { q: "Más o menos, ¿cuánto se tardó en construir Angkor Wat?", choices: ["Unos 3 días", "Unos 30 años", "Unos 3000 años"], hint: "Miles de personas, piedra a piedra.", explain: "Se tardó unos treinta años en construirlo." }
    ]
  },

  // ── Calle 4: Paseo del Campanario ──
  'h4-castle-forbidden-city': {
    title: "La Ciudad Prohibida",
    topicName: "La Ciudad Prohibida",
    blurb: "Entra en el palacio gigante de los emperadores en Pekín, con tejados dorados y pequeños guardianes en cada cumbrera.",
    reading: [
      { title: "Un palacio como una ciudad", text: "La Ciudad Prohibida, en Pekín (China), fue el hogar de los emperadores durante casi 500 años. Se terminó en 1420 y tiene unos 980 edificios." },
      { title: "¿Por qué «prohibida»?", text: "La gente corriente no podía entrar sin permiso, por eso la llamaron la Ciudad Prohibida. Hoy es un museo y cualquiera puede visitarla." },
      { title: "Tejados dorados", text: "Sus tejados brillan con tejas amarillas vidriadas. El amarillo era el color del emperador. Sobre las cumbreras de los tejados hay filas de figuritas de animales." },
      { title: "Construcción ingeniosa", text: "Los salones son de madera. Las grandes vigas encajan con unas ménsulas de madera muy ingeniosas, así que los edificios podían doblarse un poco en vez de romperse en un terremoto." }
    ],
    dialogue: {
      npc: { name: "Bao", role: "un fabricante de tejas del palacio" },
      intro: "¡Ni hao! ¡Bienvenido! Hago las tejas doradas de los tejados del palacio. Sube la escalera conmigo: ¡la vista desde el tejado es preciosa!",
      topics: [
        { ask: "¿Cómo de grande es el palacio?", answer: "¡Enorme! Tiene unos 980 edificios dentro de sus murallas, y un foso que lo rodea entero. Es como una ciudad entera dentro de un solo palacio." },
        { ask: "¿Quiénes son las figuritas del tejado?", answer: "¡Son los guardianes del tejado! Un jinete pequeñito va delante de una fila de animales, como un dragón, un fénix y un león. Cuanto más importante es un salón, más figuras tiene. ¡El salón más grande tiene diez!" },
        { ask: "¿Cómo movíais las piedras enormes?", answer: "En invierno echábamos agua en los caminos para hacer pistas de hielo. Luego deslizábamos las piedras gigantes sobre trineos. ¡Mucho más fácil que arrastrarlas por la tierra!" },
        { ask: "¿Por qué los tejados son amarillos?", answer: "El amarillo era el color propio del emperador. Casi todos los demás edificios de la ciudad tenían tejados grises, así que el palacio brilla dorado entre ellos." },
        { ask: "¿Quién vive aquí ahora?", answer: "Ahora no vive nadie. En 1925 se convirtió en el Museo del Palacio, y ahora vienen millones de visitantes cada año a ver sus salones y tesoros." }
      ],
      challenge: {
        q: "¿Por qué la llamaban la Ciudad Prohibida?",
        choices: ["La gente corriente no podía entrar sin permiso", "Estaba hecha de fruta prohibida", "Nadie la había visto nunca"],
        explain: "Solo las personas con permiso podían entrar en el palacio de los emperadores, por eso la llamaban prohibida."
      },
      farewell: "¡Zaijian! ¡Adiós! Si alguna vez vienes, cuenta los guardianes pequeñitos de los tejados."
    },
    timeline: {
      title: "La Ciudad Prohibida",
      events: [
        { label: "Empieza la construcción en Pekín", when: "1406" },
        { label: "Se termina la Ciudad Prohibida", when: "1420" },
        { label: "Se instalan los emperadores de una nueva familia, los Qing", when: "1644" },
        { label: "El palacio abre como Museo del Palacio", when: "1925" },
        { label: "Pasa a ser Patrimonio de la Humanidad", when: "1987" }
      ]
    },
    artifact: {
      name: "Guardianes pequeñitos del tejado",
      text: "Una cumbrera de tejas doradas con una fila de figuritas: un jinete delante y, detrás, animales como un dragón y un fénix. Se creía que vigilaban el salón."
    },
    quiz: [
      { q: "¿En qué ciudad está la Ciudad Prohibida?", choices: ["Pekín, China", "París, Francia", "El Cairo, Egipto"], hint: "La capital de China.", explain: "La Ciudad Prohibida está en Pekín, China." },
      { q: "Más o menos, ¿cuántos edificios tiene?", choices: ["Unos 9", "Unos 980", "Alrededor de 1 millón"], hint: "Como una ciudad entera dentro de un palacio.", explain: "La Ciudad Prohibida tiene unos 980 edificios." },
      { q: "¿De qué color eran las tejas del palacio?", choices: ["Rosas", "Negras", "Amarillas, el color del emperador"], hint: "Brillan doradas.", explain: "Los tejados están cubiertos de tejas amarillas vidriadas, el color del emperador." },
      { q: "¿Cómo movían los trabajadores las piedras gigantes en invierno?", choices: ["Las deslizaban en trineos por caminos de hielo", "Las llevaban volando en globos", "Las hacían rodar sobre neumáticos de goma"], hint: "El agua se congela en invierno.", explain: "Echaban agua en los caminos para hacer hielo y luego deslizaban las piedras sobre trineos." },
      { q: "¿Qué es hoy la Ciudad Prohibida?", choices: ["Un museo que cualquiera puede visitar", "Una cárcel secreta", "Una escuela para dragones"], hint: "Desde 1925.", explain: "Desde 1925 es el Museo del Palacio, abierto a los visitantes." }
    ]
  },
  'h4-castle-jikji': {
    title: "El Jikji, el libro de tipos metálicos más antiguo",
    topicName: "El Jikji y los tipos metálicos",
    blurb: "Visita un templo coreano en 1377, donde unos monjes imprimieron el libro hecho con letras de metal más antiguo que se conserva.",
    reading: [
      { title: "Un libro muy antiguo", text: "El Jikji es un libro de enseñanzas sabias de monjes budistas. Se imprimió en 1377 en el templo de Heungdeok, en Cheongju (Corea)." },
      { title: "Letras de metal", text: "Cada letra estaba hecha de metal, y las letras se podían cambiar de sitio y volver a usar para la página siguiente. A esto se le llama tipos móviles de metal." },
      { title: "El más antiguo que queda", text: "El Jikji es el libro impreso con tipos móviles de metal más antiguo que se conserva. Se imprimió unos 78 años antes de la famosa Biblia de Gutenberg, en Alemania." },
      { title: "En una biblioteca muy lejana", text: "De sus dos tomos, solo se ha conservado el segundo. Hoy se guarda en la Biblioteca Nacional de Francia, en París." }
    ],
    dialogue: {
      npc: { name: "Seol", role: "un joven monje del templo de Heungdeok" },
      intro: "¡Bienvenido al templo de Heungdeok! Pasa, por favor, pero sin hacer ruido: hoy estamos imprimiendo. ¿Quieres ver cómo hacemos un libro?",
      topics: [
        { ask: "¿Cómo imprimís una página?", answer: "Primero colocamos las letritas de metal en un marco, en el orden correcto. Luego les pasamos tinta con un pincel, ponemos el papel encima y lo frotamos con suavidad. Levantas el papel, ¡y ahí está la página!" },
        { ask: "¿Por qué usáis letras de metal?", answer: "Tallar un bloque de madera entero para cada página lleva mucho tiempo, y ese bloque solo sirve para imprimir esa página. Las letras de metal son fuertes y se pueden usar una y otra vez para páginas nuevas." },
        { ask: "¿Qué hay en el libro?", answer: "Enseñanzas sabias de muchos monjes budistas, reunidas por un maestro llamado Baegun. Ayudan a la gente a pensar con cuidado y a ser amable." },
        { ask: "¿Cómo llegó a Francia?", answer: "Cientos de años después, un visitante francés en Corea coleccionó libros antiguos y se llevó este a su país. Una bibliotecaria coreana en París, la doctora Park Byeong-seon, mostró al mundo en 1972 lo antiguo y especial que es." },
        { ask: "¿Se puede ver hoy?", answer: "Se cuida con mucho mimo en París. En Cheongju hay un museo de la imprenta donde puedes aprender cómo se hizo, y la UNESCO entrega un Premio Jikji a quienes ayudan a proteger escritos antiguos." }
      ],
      challenge: {
        q: "¿Qué hace tan especial al Jikji?",
        choices: ["Es el libro impreso con tipos móviles de metal más antiguo que se conserva", "Es el libro más grande del mundo", "Se escribió en la Luna"],
        explain: "El Jikji, impreso en 1377, es el libro más antiguo conservado que se imprimió con tipos móviles de metal."
      },
      farewell: "¡Gracias por tu visita! Cada vez que leas un libro impreso, acuérdate de las letritas de metal de hace mucho tiempo."
    },
    timeline: {
      title: "Imprimir con tipos móviles",
      events: [
        { label: "Bi Sheng, en China, hace tipos móviles de arcilla cocida", when: "hacia 1040" },
        { label: "El Jikji se imprime con tipos de metal en Cheongju, Corea", when: "1377" },
        { label: "Gutenberg imprime su Biblia con tipos de metal en Alemania", when: "hacia 1455" },
        { label: "La doctora Park Byeong-seon da a conocer el Jikji al mundo en una exposición de libros en París", when: "1972" },
        { label: "El Jikji entra en el registro Memoria del Mundo de la UNESCO", when: "2001" }
      ]
    },
    artifact: {
      name: "Tipos de metal en un marco",
      text: "Letritas de metal colocadas una al lado de otra en un marco, listas para entintarlas e imprimir. Cada letra se podía usar una y otra vez."
    },
    quiz: [
      { q: "¿Dónde se imprimió el Jikji?", choices: ["En un templo de Cheongju, Corea", "En un castillo de Escocia", "En un barco"], hint: "En el templo de Heungdeok.", explain: "El Jikji se imprimió en el templo de Heungdeok, en Cheongju, Corea." },
      { q: "¿Cuándo se imprimió el Jikji?", choices: ["1977", "1377", "377"], hint: "Entre 1300 y 1400.", explain: "El Jikji se imprimió en 1377." },
      { q: "¿Qué son los tipos móviles?", choices: ["Papel que se mueve solo", "Libros con ruedas", "Letras sueltas que se pueden reordenar y volver a usar"], hint: "Las letras pasan de una página a otra.", explain: "Los tipos móviles son letras sueltas que se colocan en orden, se imprimen y luego se vuelven a usar para páginas nuevas." },
      { q: "¿Dónde se guarda hoy el Jikji?", choices: ["En la Biblioteca Nacional de Francia, en París", "Bajo el mar", "En una panadería"], hint: "Una gran biblioteca de Europa.", explain: "El tomo del Jikji que se conserva está en la Biblioteca Nacional de Francia." },
      { q: "¿Unos cuántos años antes que la Biblia de Gutenberg se imprimió el Jikji?", choices: ["Unos 78 años", "Unos 7 años", "Unos 780 años"], hint: "1455 − 1377", explain: "1455 − 1377 = 78, así que el Jikji se imprimió unos 78 años antes." }
    ]
  },

  // ── Calle 5: Jardín del Reloj de Sol ──
  'h5-castle-great-zimbabwe': {
    title: "Gran Zimbabue, la ciudad de piedra",
    topicName: "Gran Zimbabue",
    blurb: "Descubre una gran ciudad del sur de África cuyos muros de piedra se sostienen sin nada de mortero.",
    reading: [
      { title: "Casas de piedra", text: "Más o menos entre 1100 y 1450 hubo una gran ciudad en el sur de África. Su nombre, Gran Zimbabue, viene de unas palabras shona que significan «casas de piedra»." },
      { title: "Sin mortero", text: "Sus constructores encajaron bloques de granito tan bien que los muros no necesitaron mortero. El muro más grande mide hasta unos 11 metros de alto, y todavía sigue en pie." },
      { title: "Una ciudad de comerciantes", text: "Gran Zimbabue comerciaba con oro y marfil con los puertos de la costa. A cambio llegaban cuentas de vidrio de la India y cerámica de China y de Persia." },
      { title: "Los pájaros de piedra", text: "Allí se encontraron pájaros tallados en esteatita, una piedra blanda. Uno aparece hoy en la bandera de Zimbabue, y todo el país lleva el nombre de la ciudad." }
    ],
    dialogue: {
      npc: { name: "Tendai", role: "un constructor de piedra de Gran Zimbabue" },
      intro: "¡Mhoro! ¡Hola! Bienvenido a nuestra ciudad de piedra. Soy constructor. Estaba colocando los últimos bloques de este muro. ¿Quieres dar una vuelta?",
      topics: [
        { ask: "¿Cómo se sostienen vuestros muros sin mortero?", answer: "¡Con un trabajo muy cuidadoso! Partimos el granito en bloques bien rectos y colocamos cada uno para que apriete bien sobre los de abajo. El peso del muro lo mantiene todo unido." },
        { ask: "¿Qué es el gran muro redondo?", answer: "Es el Gran Recinto, el muro más grande de todos. Por arriba está decorado con un dibujo en zigzag, y dentro hay una torre alta con forma de cono, de piedra maciza." },
        { ask: "¿De dónde sacáis los bloques?", answer: "Las colinas de aquí son de granito. Cuando la roca se calienta al sol y se enfría por la noche, se le desprenden capas. Partimos esas capas en bloques del tamaño justo." },
        { ask: "¿Con quién comerciáis?", answer: "Los comerciantes llevan nuestro oro y nuestro marfil a los puertos del océano Índico. ¡Y traen cuentas de vidrio, telas y hasta cerámica de China!" },
        { ask: "¿Qué son los pájaros de piedra?", answer: "Unos pájaros preciosos tallados en esteatita, posados sobre columnas altas. Hoy uno de ellos está en la bandera de Zimbabue, volando con orgullo." }
      ],
      challenge: {
        q: "¿Qué tienen de especial los muros de Gran Zimbabue?",
        choices: ["Se construyeron sin nada de mortero", "Son de hielo", "Están pintados de dorado"],
        explain: "Los bloques de granito encajaban tan bien que los muros no necesitaron mortero."
      },
      farewell: "¡Famba zvakanaka! ¡Que te vaya bien! Las piedras seguirán en pie cuando vuelvas."
    },
    timeline: {
      title: "Gran Zimbabue",
      events: [
        { label: "La gente empieza a construir con piedra en Gran Zimbabue", when: "hacia 1100" },
        { label: "La ciudad está en su mejor momento y comercia con oro con la costa", when: "hacia 1300" },
        { label: "La gente se va marchando poco a poco a otros lugares", when: "hacia 1450" },
        { label: "El país de Zimbabue toma su nombre de la ciudad", when: "1980" },
        { label: "Gran Zimbabue pasa a ser Patrimonio de la Humanidad", when: "1986" }
      ]
    },
    artifact: {
      name: "Un pájaro de esteatita",
      text: "Un pájaro tallado en esteatita, posado en lo alto de una columna alta. En Gran Zimbabue se encontraron ocho de estos pájaros, y uno aparece en la bandera de Zimbabue."
    },
    quiz: [
      { q: "¿Qué significa «Zimbabue»?", choices: ["Casas de piedra", "Río dorado", "Árboles altos"], hint: "¡Mira los muros!", explain: "El nombre viene de unas palabras shona que significan «casas de piedra»." },
      { q: "¿Qué mantenía unidos los muros de Gran Zimbabue?", choices: ["Pegamento", "Bloques encajados con cuidado, sin mortero", "Clavos"], hint: "No hay pasta entre las piedras.", explain: "Los bloques encajaban tan bien que no hacía falta mortero." },
      { q: "¿Con qué comerciaba Gran Zimbabue con la costa?", choices: ["Con nieve y hielo", "Con bicicletas", "Con oro y marfil"], hint: "Algo brillante y valioso.", explain: "Gran Zimbabue cambiaba oro y marfil por cuentas, telas y cerámica." },
      { q: "¿Qué aparece hoy en la bandera de Zimbabue?", choices: ["Un pájaro de esteatita de Gran Zimbabue", "Un león", "Un castillo"], hint: "Se talló en esteatita.", explain: "Uno de los pájaros de esteatita encontrados en Gran Zimbabue está en la bandera." },
      { q: "Más o menos, ¿cuándo fue Gran Zimbabue una ciudad llena de vida?", choices: ["Entre 1100 y 1450, más o menos", "El año pasado", "Hace 10 000 años"], hint: "En la Edad Media.", explain: "Gran Zimbabue fue una gran ciudad más o menos entre 1100 y 1450." }
    ]
  },
  'h5-castle-hildegard': {
    title: "Hildegarda de Bingen: música, plantas y grandes ideas",
    topicName: "Hildegarda de Bingen",
    blurb: "Conoce a una líder de la Edad Media que componía música, estudiaba las plantas y escribía a los reyes.",
    reading: [
      { title: "Una niña curiosa", text: "Hildegarda nació en Alemania en 1098. De niña se fue a vivir a una comunidad religiosa, donde aprendió a leer, a escribir y a cantar." },
      { title: "Una líder", text: "De mayor llegó a dirigir su propia comunidad de monjas. Hacia 1150 la trasladó a un convento nuevo cerca del pueblo de Bingen, junto al río Rin." },
      { title: "Música", text: "Hildegarda escribió muchas canciones, y hasta una obra de teatro musical. Es una de las primeras compositoras cuyo nombre conocemos y cuya música se sigue cantando hoy." },
      { title: "Plantas y salud", text: "Escribió libros sobre plantas, animales, piedras y cómo mantenerse sano. También escribió cartas a papas, reyes y emperadores para contarles sus ideas." }
    ],
    dialogue: {
      npc: { name: "Hildegarda de Bingen", role: "una líder, escritora y compositora" },
      intro: "¡Bienvenido, querido niño! Ven a sentarte conmigo en el jardín. Hoy las hierbas huelen de maravilla. ¿De qué te gustaría hablar?",
      topics: [
        { ask: "¿Por qué escribes canciones?", answer: "¡La música alegra el corazón! Escribo canciones para que mis hermanas las canten juntas. Mis melodías suben muy alto y bajan en picado, como los pájaros en el cielo." },
        { ask: "¿Qué sabes de las plantas?", answer: "Las observo con atención y apunto lo que aprendo: qué hierbas huelen dulce, cuáles crecen a la sombra y cuáles se han usado para ayudar a la gente a sentirse mejor. ¡Me encanta el verde fresco de todo lo que crece!" },
        { ask: "¿De verdad escribías a los reyes?", answer: "¡Sí! Escribí a papas, a reyes y a un emperador, y también a gente sencilla. Cuando tenía algo importante que decir, lo decía con amabilidad y con claridad." },
        { ask: "¿Te inventaste tu propio idioma?", answer: "¡Sí, me inventé algunas palabras y letras secretas! Nadie sabe exactamente por qué. Quizá solo por la alegría de inventarlas." },
        { ask: "¿La gente todavía se acuerda de ti?", answer: "¡Sí! La gente sigue cantando mi música y leyendo mis libros, más de 800 años después. En 2012 me dieron un título especial como una de las grandes maestras de la Iglesia." }
      ],
      challenge: {
        q: "¿Cuál de estas cosas hizo Hildegarda?",
        choices: ["Escribió música y libros sobre plantas", "Dio la vuelta al mundo en barco", "Inventó el teléfono"],
        explain: "Hildegarda escribió música, libros sobre plantas y salud, y cartas a reyes y papas."
      },
      farewell: "Ve con calma, pequeño, y sigue preguntándote cosas sobre todo. Una mente curiosa es un jardín que nunca deja de crecer."
    },
    timeline: {
      title: "La vida de Hildegarda",
      events: [
        { label: "Hildegarda nace en Alemania", when: "1098" },
        { label: "Pasa a dirigir su comunidad", when: "1136" },
        { label: "Traslada su comunidad a un convento nuevo cerca de Bingen", when: "hacia 1150" },
        { label: "Escribe una obra de teatro musical, una de las más antiguas que conocemos", when: "hacia 1151" },
        { label: "La nombran una de las grandes maestras de la Iglesia", when: "2012" }
      ]
    },
    artifact: {
      name: "Un cancionero medieval",
      text: "Antes de la imprenta, los libros como este se escribían y se pintaban a mano. Las canciones de Hildegarda se apuntaron en libros así, y por eso todavía hoy podemos cantarlas."
    },
    quiz: [
      { q: "¿En qué país nació Hildegarda?", choices: ["Alemania", "Japón", "Brasil"], hint: "Cerca del río Rin.", explain: "Hildegarda nació en Alemania en 1098." },
      { q: "¿Qué escribió Hildegarda?", choices: ["Videojuegos", "Canciones, y libros sobre plantas y salud", "Periódicos"], hint: "Música y naturaleza.", explain: "Escribió muchas canciones y libros sobre plantas, animales y cómo mantenerse sano." },
      { q: "¿A quién escribía cartas Hildegarda?", choices: ["A nadie", "Solo a su gato", "A papas, reyes y emperadores, y también a gente sencilla"], hint: "¡A gente muy importante!", explain: "Escribió a papas, reyes y emperadores, y también a gente sencilla." },
      { q: "¿Por qué todavía conocemos la música de Hildegarda?", choices: ["Porque se apuntó en libros", "Porque la grabó con un móvil", "Porque se talló en la Luna"], hint: "Antes de la imprenta, los libros se escribían a mano.", explain: "Sus canciones se apuntaron en libros escritos a mano, por eso todavía podemos cantarlas." },
      { q: "Más o menos, ¿cuándo vivió Hildegarda?", choices: ["Hace unos 900 años", "Hace unos 90 años", "Hace unos 9000 años"], hint: "Nació en 1098.", explain: "Vivió de 1098 a 1179, hace unos 900 años." }
    ]
  },

  // ── Calle 6: Bastión de los Globos ──
  'h6-castle-magna-carta': {
    title: "La Carta Magna: reglas incluso para un rey",
    topicName: "La Carta Magna",
    blurb: "En un prado junto al río Támesis, en 1215, un rey aceptó que incluso él debía cumplir la ley.",
    reading: [
      { title: "Un rey impopular", text: "En 1215, el rey Juan de Inglaterra caía muy mal. Hacía pagar impuestos muy altos y castigaba a la gente injustamente. Muchos señores poderosos, llamados barones, estaban enfadados." },
      { title: "La Gran Carta", text: "En Runnymede, un prado junto al río Támesis, el rey aceptó una lista de promesas. Se llamó Carta Magna, que en latín significa «Gran Carta»." },
      { title: "Una gran idea", text: "Su idea más famosa es que todo el mundo, incluso el rey, debe cumplir la ley. También prometía que a las personas libres no se las podía castigar sin un juicio justo." },
      { title: "Todavía recordada", text: "Se conservan cuatro copias de 1215. Las ideas de la Carta Magna ayudaron a inspirar promesas de derechos posteriores, como la Carta de Derechos de los Estados Unidos y la Declaración Universal de los Derechos Humanos." }
    ],
    dialogue: {
      npc: { name: "Hermano Hugo", role: "un escriba que copiaba la Carta Magna" },
      intro: "¡Buenos días! Por favor, cuidado con el tintero. Soy escriba: mi trabajo es copiar la Gran Carta, palabra por palabra. ¿Quieres que te la cuente?",
      topics: [
        { ask: "¿Por qué se escribió la carta?", answer: "Los barones estaban hartos de las reglas injustas y los impuestos altos del rey Juan. Le pidieron que prometiera, por escrito, cumplir la ley como todos los demás." },
        { ask: "¿La firmó el rey?", answer: "¡En aquella época los reyes no firmaban con su nombre! En su lugar, se ponía el gran sello de cera del rey para mostrar que estaba de acuerdo." },
        { ask: "¿En qué idioma está?", answer: "En latín, el idioma de los escritos importantes en mi época. La escribo en pergamino, un material liso hecho de piel de animal, con una pluma de ganso." },
        { ask: "¿Todos cumplieron las promesas?", answer: "¡Al principio, no! Solo unos meses después se anuló. Pero se volvió a escribir en los años siguientes, y en 1225 pasó a formar parte de la ley de Inglaterra." },
        { ask: "¿Por qué sigue siendo importante?", answer: "Por su gran idea: nadie está por encima de la ley, ni siquiera un rey. Desde entonces, gente de todo el mundo ha construido sobre esa idea." }
      ],
      challenge: {
        q: "¿Cuál es la idea más famosa de la Carta Magna?",
        choices: ["Todo el mundo, incluso el rey, debe cumplir la ley", "El rey puede hacer lo que quiera", "Los castillos deben pintarse de blanco"],
        explain: "La Carta Magna decía que incluso el rey tenía que cumplir la ley."
      },
      farewell: "¡Adiós! Recuerda: las buenas reglas son para todos, para los reyes y para los niños."
    },
    timeline: {
      title: "La Carta Magna y su gran idea",
      events: [
        { label: "El rey Juan acepta la Carta Magna en Runnymede", when: "1215" },
        { label: "Una nueva versión de la Carta Magna pasa a formar parte de la ley inglesa", when: "1225" },
        { label: "Se añade a la Constitución de los Estados Unidos su Carta de Derechos", when: "1791" },
        { label: "Las Naciones Unidas aprueban la Declaración Universal de los Derechos Humanos", when: "1948" },
        { label: "Se celebra el 800 cumpleaños de la Carta Magna", when: "2015" }
      ]
    },
    artifact: {
      name: "Un sello real de cera",
      text: "Los reyes no firmaban con su nombre. En su lugar, se apretaba un gran sello de metal sobre cera caliente en el documento, para mostrar que el rey estaba de acuerdo."
    },
    quiz: [
      { q: "¿En qué año se aceptó la Carta Magna?", choices: ["1215", "1815", "2015"], hint: "Entre 1200 y 1300.", explain: "El rey Juan aceptó la Carta Magna en 1215." },
      { q: "¿Qué significa «Carta Magna»?", choices: ["Carta pequeña", "Gran Carta", "Castillo real"], hint: "Magna significa grande.", explain: "Carta Magna es «Gran Carta» en latín." },
      { q: "¿Cómo mostró el rey Juan que estaba de acuerdo?", choices: ["La firmó con una pluma", "Dio la mano en un vídeo", "Se puso su sello de cera en ella"], hint: "Entonces los reyes no firmaban con su nombre.", explain: "Se le puso el gran sello de cera del rey para mostrar que estaba de acuerdo." },
      { q: "¿Por qué la Carta Magna sigue siendo importante hoy?", choices: ["Decía que nadie está por encima de la ley", "Inventó el fútbol", "Hizo más rico al rey"], hint: "Ni siquiera un rey…", explain: "Su gran idea, que todos deben cumplir la ley, inspiró ideas sobre los derechos en todo el mundo." },
      { q: "¿Quiénes eran los barones?", choices: ["Señores poderosos que querían que el rey fuera justo", "Panaderos", "Los perros del rey"], hint: "Le pidieron al rey que hiciera promesas.", explain: "Los barones eran señores poderosos que querían que el rey Juan gobernara de forma justa." }
    ]
  },
  'h6-castle-universities': {
    title: "Fátima al-Fihri y las primeras universidades",
    topicName: "Las primeras universidades",
    blurb: "Visita Fez en el año 859, donde Fátima al-Fihri fundó un lugar de estudio que sigue abierto hoy.",
    reading: [
      { title: "Un regalo para aprender", text: "En el año 859, en la ciudad de Fez (Marruecos), una joven llamada Fátima al-Fihri usó el dinero de su familia para fundar al-Qarawiyyin, una mezquita que se convirtió en un gran lugar de estudio." },
      { title: "Todavía enseña", text: "Al-Qarawiyyin lleva más de mil años enseñando a estudiantes. A menudo se dice que es el lugar de estudio más antiguo del mundo que sigue abierto." },
      { title: "Universidades en Europa", text: "Más tarde, estudiantes y profesores de Europa formaron universidades: en Bolonia (Italia), desde más o menos 1088, y luego en lugares como Oxford, París y Cambridge." },
      { title: "Aprender hace mucho tiempo", text: "Había pocos libros, así que los profesores solían leer en voz alta mientras los estudiantes escuchaban y tomaban apuntes. Estudiaban gramática, lógica, aritmética, geometría, música y astronomía." }
    ],
    dialogue: {
      npc: { name: "Fátima al-Fihri", role: "la fundadora de al-Qarawiyyin, en Fez" },
      intro: "¡La paz sea contigo, y bienvenido a Fez! Entra en el patio, junto a la fuente. Este es nuestro nuevo lugar de oración y de estudio. ¿Te cuento cómo empezó?",
      topics: [
        { ask: "¿Por qué lo construiste?", answer: "Mi padre nos dejó algo de dinero a mi hermana Maryam y a mí. Yo quería regalarle a nuestra ciudad algo que durara: un lugar precioso donde la gente pudiera rezar y aprender." },
        { ask: "¿Qué se aprende aquí?", answer: "Con el tiempo, vinieron sabios a enseñar y estudiar muchas materias: el Corán y las leyes, pero también gramática, matemáticas, astronomía y medicina." },
        { ask: "¿Quién venía a estudiar?", answer: "¡Estudiantes de cerca y de lejos! A lo largo de los siglos estudiaron aquí muchos pensadores famosos, y llevaron lo que aprendieron a otras tierras." },
        { ask: "¿Cómo eran las universidades en Europa?", answer: "Grupos de estudiantes y profesores se reunían en ciudades como Bolonia y Oxford. Hablaban latín, llevaban túnicas largas y discutían sobre grandes preguntas. ¡Los graduados todavía llevan toga hoy!" },
        { ask: "¿Sigue abierto?", answer: "¡Sí! Los estudiantes llevan más de mil años aprendiendo en al-Qarawiyyin. Su biblioteca es una de las más antiguas del mundo." }
      ],
      challenge: {
        q: "¿Qué fundó Fátima al-Fihri en Fez en el año 859?",
        choices: ["Al-Qarawiyyin, una mezquita que se convirtió en un gran lugar de estudio", "Un castillo para caballeros", "Una torre del reloj"],
        explain: "Fátima al-Fihri fundó al-Qarawiyyin, que creció hasta ser un gran lugar de estudio que sigue abierto hoy."
      },
      farewell: "Ve en paz, y no dejes nunca de aprender. Un regalo de conocimiento dura más que cualquier edificio."
    },
    timeline: {
      title: "Grandes lugares de estudio",
      events: [
        { label: "Nalanda, un gran centro de estudio, crece en la India", when: "hacia el año 427" },
        { label: "Fátima al-Fihri funda al-Qarawiyyin en Fez, Marruecos", when: "859" },
        { label: "Los estudiantes empiezan a reunirse en la Universidad de Bolonia", when: "hacia 1088" },
        { label: "Empieza la Universidad de Cambridge", when: "1209" },
        { label: "Se funda la Universidad de Salamanca, en España", when: "1218" }
      ]
    },
    artifact: {
      name: "Una pluma y un tintero",
      text: "Los estudiantes y los sabios escribían con plumas cortadas de plumas grandes de ave, mojadas en tinta. Cada libro había que copiarlo a mano."
    },
    quiz: [
      { q: "¿En qué ciudad fundó Fátima al-Fihri al-Qarawiyyin?", choices: ["Fez, Marruecos", "Londres, Inglaterra", "Tokio, Japón"], hint: "Una ciudad del norte de África.", explain: "Fundó al-Qarawiyyin en Fez, Marruecos, en el año 859." },
      { q: "¿Qué tiene de especial al-Qarawiyyin?", choices: ["Está hecha de cristal", "A menudo se dice que es el lugar de estudio más antiguo que sigue abierto", "Flota"], hint: "Más de mil años enseñando.", explain: "Lleva más de mil años enseñando a estudiantes y sigue abierta." },
      { q: "¿Por qué los profesores solían leer los libros en voz alta?", choices: ["Los estudiantes no oían bien", "A los profesores les gustaba cantar", "Había pocos libros, porque cada uno se copiaba a mano"], hint: "En Europa todavía no había imprenta.", explain: "Había pocos libros y se copiaban a mano, así que los profesores los leían en voz alta." },
      { q: "¿Cuál es una de las universidades más antiguas de Europa?", choices: ["Bolonia, en Italia", "La Universidad de la Luna", "Hogwarts"], hint: "Desde más o menos 1088.", explain: "La Universidad de Bolonia empezó hacia 1088." },
      { q: "¿Qué llevan todavía hoy los graduados universitarios, como los estudiantes de hace mucho tiempo?", choices: ["Togas largas", "Armaduras", "Bañadores"], hint: "Piensa en las fotos de graduación.", explain: "Los graduados todavía llevan togas largas, como los estudiantes de la Edad Media." }
    ]
  },

  // ── Calle 7: Jardín de la Corona ──
  'h7-castle-leonardo': {
    title: "Leonardo da Vinci sueña con volar",
    topicName: "Las máquinas voladoras de Leonardo",
    blurb: "Abre los cuadernos de Leonardo da Vinci, llenos de pájaros, alas y máquinas para volar.",
    reading: [
      { title: "Pintor e inventor", text: "Leonardo da Vinci nació en Italia en 1452. Pintó la Mona Lisa, pero también fue ingeniero, inventor y científico." },
      { title: "Cuadernos de ideas", text: "Leonardo llenó miles de páginas de dibujos y notas, muchas veces en escritura de espejo, de derecha a izquierda. Algunos de sus temas favoritos eran los pájaros y el vuelo." },
      { title: "Máquinas para el cielo", text: "Dibujó una máquina con alas que aleteaban, un «tornillo aéreo» que giraba como un helicóptero y un paracaídas con forma de pirámide. Hacia 1505 escribió un librito sobre cómo vuelan los pájaros." },
      { title: "Adelantado a su tiempo", text: "Sus máquinas voladoras nunca volaron mientras él vivió: los músculos de las personas son demasiado débiles para mover unas alas tan grandes. Pero en el año 2000, un paracaídas hecho con su diseño funcionó perfectamente." }
    ],
    dialogue: {
      npc: { name: "Leonardo da Vinci", role: "un pintor, inventor y científico" },
      intro: "¡Ah, bienvenido a mi taller! Cuidado, que hay alas secándose en la mesa. Soy Leonardo. Dime, ¿alguna vez has mirado un pájaro y has deseado poder volar?",
      topics: [
        { ask: "¿Por qué observas a los pájaros?", answer: "¡Para aprender sus secretos! Miro cómo inclinan las alas, cómo se dejan llevar por el viento sin aletear y cómo dirigen el vuelo con la cola. La naturaleza es la mejor maestra." },
        { ask: "¿Qué es la máquina de aletear?", answer: "Un armazón con unas alas grandes, como las de un murciélago, que una persona movería con los brazos y las piernas. Más tarde me di cuenta de que una persona no es lo bastante fuerte. ¡Los pájaros tienen músculos muy fuertes para su tamaño!" },
        { ask: "¿Qué es el tornillo aéreo?", answer: "Una gran vela de lino en espiral. Pensaba que, si giraba lo bastante rápido, se enroscaría en el aire hacia arriba, como un tornillo en la madera. Los helicópteros de hoy funcionan de otra manera, ¡pero la idea de las palas que giran ya está ahí!" },
        { ask: "¿Por qué escribes al revés?", answer: "¡Soy zurdo, y si escribo de derecha a izquierda no emborrono la tinta! Pon mi cuaderno delante de un espejo y lo leerás sin problema." },
        { ask: "¿Funcionó alguna de tus máquinas?", answer: "En mi época, no. Pero muchos años después, alguien construyó mi paracaídas, y en el año 2000 un paracaidista valiente bajó flotando sano y salvo con él. ¡Las ideas pueden esperar mucho tiempo para volar!" }
      ],
      challenge: {
        q: "¿Por qué no podía volar la máquina de aletear de Leonardo?",
        choices: ["Los músculos de una persona son demasiado débiles para mover alas tan grandes", "Estaba pintada del color equivocado", "En Italia no había viento"],
        explain: "A diferencia de los pájaros, las personas no son lo bastante fuertes para su tamaño como para mover unas alas tan grandes."
      },
      farewell: "¡Adiós, joven inventor! Mantén los ojos bien abiertos y lleva siempre un cuaderno en el bolsillo."
    },
    timeline: {
      title: "Sueños de volar",
      events: [
        { label: "Leonardo da Vinci nace en Vinci, Italia", when: "1452" },
        { label: "Leonardo dibuja un paracaídas con forma de pirámide", when: "hacia 1485" },
        { label: "Leonardo escribe un librito sobre el vuelo de los pájaros", when: "hacia 1505" },
        { label: "Los hermanos Wright hacen el primer vuelo en avión con motor", when: "1903" },
        { label: "Se prueba un paracaídas hecho con el diseño de Leonardo, y funciona", when: "2000" }
      ]
    },
    artifact: {
      name: "Una maqueta de la máquina de alas de Leonardo",
      text: "Un armazón de madera con dos grandes alas, como las de un murciélago. Leonardo la dibujó en sus cuadernos, pero nunca llegó a volar."
    },
    quiz: [
      { q: "¿Qué cuadro famoso pintó Leonardo?", choices: ["La Mona Lisa", "La noche estrellada", "El grito"], hint: "Una señora que sonríe.", explain: "Leonardo da Vinci pintó la Mona Lisa." },
      { q: "¿Qué estudió Leonardo para aprender sobre el vuelo?", choices: ["Los peces", "Los pájaros", "Los caracoles"], hint: "Vuelan todos los días.", explain: "Leonardo observó con atención a los pájaros y escribió un librito sobre cómo vuelan." },
      { q: "¿Por qué escribía Leonardo de derecha a izquierda?", choices: ["Para guardar secretos ante el rey", "Su pluma solo funcionaba al revés", "Era zurdo, y así no emborronaba la tinta"], hint: "¿Con qué mano escribía?", explain: "Leonardo era zurdo; al escribir de derecha a izquierda, su mano no pasaba por la tinta mojada." },
      { q: "¿Qué diseño de Leonardo se probó en el año 2000 y funcionó?", choices: ["Su paracaídas", "Su máquina de alas", "Su caballero robot"], hint: "Baja flotando, no sube.", explain: "En el año 2000 se probó un paracaídas hecho con su diseño, y funcionó." },
      { q: "¿Cómo era el «tornillo aéreo» de Leonardo?", choices: ["Una gran vela en espiral que giraba", "Un globo aerostático", "Una cometa"], hint: "Tenía que girar para subir por el aire.", explain: "El tornillo aéreo era una gran espiral de lino pensada para girar y subir por el aire." }
    ]
  },
  'h7-castle-balloons': {
    title: "Los primeros vuelos en globo",
    topicName: "Los primeros vuelos en globo",
    blurb: "En 1783, una oveja, un pato y un gallo volaron primero, y luego unas personas flotaron sobre París.",
    reading: [
      { title: "Dos fabricantes de papel", text: "Joseph y Étienne Montgolfier eran dos hermanos que fabricaban papel en Francia. Se dieron cuenta de que el aire caliente de un fuego podía levantar una bolsa ligera de papel o de tela." },
      { title: "Primero los animales", text: "En 1783, en el palacio de Versalles, los hermanos soltaron un globo que llevaba una oveja, un pato y un gallo. Volaron unos 8 minutos y aterrizaron sanos y salvos." },
      { title: "Vuelan las personas", text: "Dos meses después, dos hombres flotaron sobre París en un globo Montgolfier durante unos 25 minutos. Fueron las primeras personas en volar libres por el aire." },
      { title: "También con hidrógeno", text: "Solo unos días después, Jacques Charles y Nicolas-Louis Robert volaron en un globo lleno de hidrógeno, un gas muy ligero. Por fin, la gente había subido al cielo." }
    ],
    dialogue: {
      npc: { name: "Louise", role: "una fabricante de papel del taller de los Montgolfier" },
      intro: "¡Bonjour! ¡Bienvenido al taller! Cuidado con los botes de engrudo: estamos pegando papel en un globo nuevo. ¿Quieres que te cuente nuestros vuelos?",
      topics: [
        { ask: "¿Cómo se les ocurrió la idea a los hermanos?", answer: "Dicen que Joseph vio cómo la ropa que se secaba sobre el fuego se hinchaba y subía. Hizo una bolsita de seda, la sujetó sobre el fuego, ¡y subió hasta el techo!" },
        { ask: "¿De qué está hecho el globo?", answer: "¡De tela forrada de papel, de nuestro propio molino de papel! Está pintado de azul con adornos dorados. Muy elegante, para volar delante del rey." },
        { ask: "¿Por qué volaron primero los animales?", answer: "Nadie sabía si se podía respirar bien allá arriba. Así que fueron primero una oveja, un pato y un gallo. Bajaron sanos y salvos, un poco sorprendidos, ¡y la oveja se hizo bastante famosa!" },
        { ask: "¿Por qué el aire caliente lo hace subir?", answer: "Al principio, los hermanos pensaban que había algo especial en el humo. En realidad, el aire caliente se expande y se vuelve más ligero que el aire más frío que lo rodea, así que el globo sube flotando, como un corcho en el agua." },
        { ask: "¿Qué vino después?", answer: "¡En 1785, un globo cruzó el mar entre Inglaterra y Francia! Más tarde llegaron los dirigibles, los aviones y, en 1999, un globo que dio la vuelta al mundo sin parar." }
      ],
      challenge: {
        q: "¿Quiénes fueron los primerísimos pasajeros de un globo Montgolfier?",
        choices: ["Una oveja, un pato y un gallo", "El rey y la reina", "Dos gatos"],
        explain: "En 1783, una oveja, un pato y un gallo volaron primero y aterrizaron sanos y salvos."
      },
      farewell: "¡Au revoir! La próxima vez que veas subir un globo, saluda a la oveja, al pato y al gallo."
    },
    timeline: {
      title: "Arriba, arriba, ¡y a volar!",
      events: [
        { label: "Animales, y luego las primeras personas, vuelan en globo en Francia", when: "1783" },
        { label: "Un globo cruza el mar de Inglaterra a Francia", when: "1785" },
        { label: "Henri Giffard vuela en un dirigible con motor de vapor", when: "1852" },
        { label: "Los hermanos Wright hacen el primer vuelo en avión con motor", when: "1903" },
        { label: "Un globo da la vuelta al mundo sin parar", when: "1999" }
      ]
    },
    artifact: {
      name: "Una maqueta de un globo Montgolfier",
      text: "Un globo alto y azul con adornos dorados y una cestita debajo. El aire caliente de un fuego lo hacía más ligero que el aire que lo rodeaba, así que subía flotando."
    },
    quiz: [
      { q: "¿En qué trabajaban los hermanos Montgolfier?", choices: ["Fabricaban papel", "Hacían pan", "Hacían relojes"], hint: "Tenían un molino.", explain: "Los hermanos Montgolfier fabricaban papel." },
      { q: "¿Quién voló primero en globo, en 1783?", choices: ["Dos astronautas", "Una oveja, un pato y un gallo", "El rey"], hint: "Por seguridad, los animales fueron primero.", explain: "Una oveja, un pato y un gallo volaron primero, en Versalles." },
      { q: "¿Por qué sube un globo aerostático?", choices: ["El humo es mágico", "El globo aletea", "El aire caliente es más ligero que el aire más frío que lo rodea"], hint: "Como un corcho que sube en el agua.", explain: "El aire caliente se expande y se vuelve más ligero que el aire más frío de alrededor, así que el globo sube flotando." },
      { q: "Más o menos, ¿cuánto duró el primer vuelo con personas?", choices: ["Unos 25 minutos", "Unos 25 días", "Unos 2 segundos"], hint: "Lo bastante para flotar sobre París.", explain: "Las primeras personas flotaron sobre París unos 25 minutos." },
      { q: "¿Con qué gas se llenó el globo de Charles y Robert?", choices: ["Con hidrógeno, un gas muy ligero", "Con agua", "Con humo"], hint: "Un gas muy ligero.", explain: "Su globo se llenó de hidrógeno, un gas mucho más ligero que el aire." }
    ]
  },

  // ───────── El Taller del Inventor (Física) ─────────
  // ── Calle 1: Mercado de la Puerta ──
  'p1-castle-floating-island': {
    title: "¿Podría flotar de verdad una isla?",
    topicName: "Flotar y hundirse",
    blurb: "Descubre qué flota y qué se hunde, y por qué una isla de roca de verdad no puede flotar en el cielo.",
    reading: [
      { title: "¿Flota o se hunde?", text: "Algunas cosas flotan en el agua, como la madera y los corchos. Otras se hunden, como las piedras y las llaves. El agua empuja hacia arriba todo lo que hay en ella." },
      { title: "Ligero para su tamaño", text: "Las cosas que son ligeras para su tamaño flotan. Las que son pesadas para su tamaño se hunden. ¡Un tronco grande puede flotar, pero una piedrecita se hunde!" },
      { title: "Islas de verdad", text: "Las islas de verdad no flotan nada. Son la parte de arriba de rocas y tierra que están apoyadas en el fondo del mar y asoman por encima del agua." },
      { title: "¿Flotar en el cielo?", text: "El aire es muchísimo más ligero que el agua, así que no puede sostener una roca pesada. Las nubes flotan porque están hechas de gotitas de agua diminutas, tan pequeñas y ligeras que el aire que se mueve las mantiene arriba. ¡Nuestro Castillo del Cielo es de fantasía!" }
    ],
    sim: {
      predict: {
        q: "Echas un bloque de madera y una piedra en el tanque de agua. ¿Cuál flota?",
        choices: ["La piedra", "El bloque de madera", "Ninguno de los dos"],
        explain: "La madera es ligera para su tamaño, así que el agua la sostiene. La piedra es pesada para su tamaño, así que se hunde."
      }
    },
    quiz: [
      { q: "¿Cuál de estas cosas flota en el agua?", choices: ["Un corcho", "Una llave", "Una piedra"], hint: "Es muy ligero para su tamaño.", explain: "Un corcho es ligero para su tamaño, así que flota." },
      { q: "¿Las islas de verdad flotan en el mar?", choices: ["Sí, van a la deriva", "No, están apoyadas en el fondo del mar", "Solo los domingos"], hint: "Son la parte de arriba de rocas y tierra.", explain: "Las islas de verdad son la parte de arriba de tierras apoyadas en el fondo del mar." },
      { q: "¿Por qué una roca pesada no puede flotar en el aire?", choices: ["Es demasiado tímida", "A las rocas no les gusta el cielo", "El aire es demasiado ligero para sostenerla"], hint: "El aire es mucho más ligero que el agua.", explain: "El aire es mucho más ligero que el agua, así que no puede sostener algo tan pesado como una roca." },
      { q: "¿De qué están hechas las nubes?", choices: ["De gotitas de agua diminutas", "De algodón", "Del humo de los castillos"], hint: "Cuando llueve, bajan.", explain: "Las nubes están hechas de gotitas de agua diminutas, tan pequeñas que el aire que se mueve las mantiene arriba." },
      { q: "Un tronco grande y una piedrecita caen a un estanque. ¿Qué pasa?", choices: ["Los dos se hunden", "El tronco flota y la piedrecita se hunde", "La piedrecita flota y el tronco se hunde"], hint: "¿Cada uno es ligero o pesado para su tamaño?", explain: "El tronco es ligero para su tamaño y flota; la piedrecita es pesada para su tamaño y se hunde." }
    ]
  },
  'p1-castle-stained-glass': {
    title: "Luz de colores y sombras",
    topicName: "Luz, color y sombras",
    blurb: "Mira cómo las vidrieras pintan luz de colores en el suelo, y juega con las sombras.",
    reading: [
      { title: "La luz va en línea recta", text: "La luz viaja en línea recta. Cuando algo le cierra el paso a la luz, se forma detrás una figura oscura: una sombra." },
      { title: "Cristal transparente", text: "El cristal transparente deja pasar la luz de lado a lado. Los muros de piedra y las puertas de madera la tapan por completo." },
      { title: "Cristal de colores", text: "El cristal rojo deja pasar la luz roja y para los demás colores. Por eso, el sol que entra por una vidriera hace manchas de colores en el suelo." },
      { title: "Sombras que se mueven", text: "Acerca una linterna a un juguete y su sombra se hace más grande. Aleja la linterna y la sombra se encoge." }
    ],
    sim: {
      predict: {
        q: "Acercas la linterna al juguete. ¿Qué le pasa a su sombra en la pared?",
        choices: ["Se hace más pequeña", "Se hace más grande", "Se vuelve roja"],
        explain: "Cerca de la linterna, el juguete tapa más luz de la que se va abriendo, así que su sombra es más grande."
      }
    },
    quiz: [
      { q: "¿Qué es una sombra?", choices: ["Una figura oscura donde se tapa la luz", "Un tipo de pintura", "Un gato dormido"], hint: "Algo se pone en el camino de la luz.", explain: "Una sombra es la figura oscura que queda detrás de algo que tapa la luz." },
      { q: "¿Cuál deja pasar la luz de lado a lado?", choices: ["Un muro de piedra", "El cristal transparente", "Una puerta de madera"], hint: "Puedes ver a través de él.", explain: "El cristal transparente deja pasar la luz." },
      { q: "¿Por qué una vidriera hace manchas rojas en el suelo?", choices: ["Alguien pintó el suelo", "El sol es rojo", "El cristal rojo solo deja pasar la luz roja"], hint: "El cristal es de colores.", explain: "El cristal rojo deja pasar la luz roja y para los demás colores." },
      { q: "¿Cómo viaja la luz?", choices: ["En línea recta", "En círculos", "En zigzag"], hint: "Piensa en el haz de una linterna.", explain: "La luz viaja en línea recta." },
      { q: "Alejas mucho la linterna del juguete. ¿Qué le pasa a la sombra?", choices: ["Se hace más grande", "Se hace más pequeña", "Desaparece para siempre"], hint: "Lo contrario de acercarla.", explain: "Al alejar la linterna, la sombra se hace más pequeña." }
    ]
  },

  // ── Calle 2: Calle de las Cintas ──
  'p2-castle-bells': {
    title: "Campanas grandes y campanas pequeñas",
    topicName: "El sonido y el tono",
    blurb: "¿Por qué las campanas grandes suenan graves y las pequeñas suenan agudas? Haz vibrar una regla y descúbrelo.",
    reading: [
      { title: "¡Din, don!", text: "Cuando se golpea una campana, el metal tiembla muy rápido. Ese temblor se llama vibración. Las vibraciones viajan por el aire hasta tus oídos y las oyes como sonido." },
      { title: "Grande y grave", text: "Una campana grande y pesada vibra despacio y da una nota grave: ¡dong! Una campana pequeña vibra rápido y da una nota aguda: ¡tin!" },
      { title: "Fuerte y suave", text: "Golpea una campana con más fuerza y vibra con temblores más grandes, así que suena más fuerte. Un golpecito suave hace un sonido suave." },
      { title: "Una campana famosa", text: "Big Ben es el nombre de la gran campana de la torre del reloj de Londres. Pesa unas 13 toneladas, tanto como dos elefantes, y retumba con una nota grave y profunda." }
    ],
    sim: {
      predict: {
        q: "Acortas el trozo de regla que vibra. ¿Qué le pasa a la nota?",
        choices: ["Se vuelve más aguda", "Se vuelve más grave", "Sigue igual"],
        explain: "Una regla más corta vibra más rápido, así que la nota es más aguda, igual que una campana pequeña."
      }
    },
    quiz: [
      { q: "¿Qué hace una campana cuando suena?", choices: ["Vibra", "Se derrite", "Se encoge"], hint: "El metal tiembla muy rápido.", explain: "Una campana que suena vibra, y las vibraciones hacen el sonido." },
      { q: "¿Qué campana da la nota más grave?", choices: ["Una campana diminuta", "Una campana enorme", "Una campana mediana"], hint: "Las cosas grandes vibran despacio.", explain: "Una campana grande vibra despacio y da una nota grave." },
      { q: "¿Cómo haces que una campana suene más fuerte?", choices: ["Pintándola", "Susurrándole", "Golpeándola con más fuerza"], hint: "Temblores más grandes.", explain: "Golpearla con más fuerza hace vibraciones más grandes, así que suena más fuerte." },
      { q: "¿Cómo llega el sonido de la campana a tus oídos?", choices: ["Por el aire", "Por una tubería", "Por correo"], hint: "¿Qué hay a nuestro alrededor?", explain: "Las vibraciones viajan por el aire hasta tus oídos." },
      { q: "¿Qué es Big Ben?", choices: ["Un gigante", "La gran campana de una torre del reloj de Londres", "Un perro del castillo"], hint: "Retumba con una nota grave y profunda.", explain: "Big Ben es la gran campana de la torre del reloj de Londres." }
    ]
  },
  'p2-castle-blacksmith': {
    title: "El imán del herrero",
    topicName: "Imanes y hierro",
    blurb: "Ayuda al herrero del castillo a descubrir qué cosas atrae un imán.",
    reading: [
      { title: "El herrero", text: "Cada pueblo con castillo tenía un herrero. El herrero calentaba el hierro hasta que brillaba y lo golpeaba con el martillo para hacer herraduras, clavos, bisagras y llaves." },
      { title: "Los imanes atraen el hierro", text: "Los imanes atraen las cosas hechas de hierro y de acero. No atraen la madera, el cristal, el plástico ni el papel." },
      { title: "No todos los metales", text: "Algunos metales, como el aluminio, el cobre y el oro, no los atrae un imán normal. ¡Un imán es una buena forma de encontrar hierro!" },
      { title: "Piedras mágicas", text: "Hace mucho tiempo, la gente encontró piedras imán: rocas que son imanes naturales. Las usaron para hacer las primeras brújulas." }
    ],
    sim: {
      predict: {
        q: "El herrero acerca un imán a un clavo de hierro, a una canica de cristal y a un bloque de madera. ¿Cuál atraerá?",
        choices: ["La canica de cristal", "El bloque de madera", "El clavo de hierro"],
        explain: "Los imanes atraen el hierro y el acero, así que el clavo de hierro salta hacia el imán."
      }
    },
    quiz: [
      { q: "¿Qué atrae un imán?", choices: ["El hierro y el acero", "La madera", "El cristal"], hint: "El metal favorito del herrero.", explain: "Los imanes atraen el hierro y el acero." },
      { q: "¿Un imán levantará una lata de aluminio?", choices: ["Sí, con facilidad", "No, el imán no atrae el aluminio", "Solo los martes"], hint: "No todos los metales son atraídos.", explain: "El aluminio es un metal, pero un imán normal no lo atrae." },
      { q: "¿Qué hacía un herrero?", choices: ["Pan", "Ventanas de cristal", "Herraduras, clavos y llaves"], hint: "Cosas de hierro.", explain: "El herrero golpeaba el hierro caliente para hacer herraduras, clavos, bisagras y llaves." },
      { q: "¿Qué es una piedra imán?", choices: ["Una roca que es un imán natural", "Una hogaza de pan muy pesada", "Una torre del castillo"], hint: "Se usó para hacer las primeras brújulas.", explain: "Una piedra imán es una roca que es un imán natural." },
      { q: "¿Cuál atraerá un imán?", choices: ["Un clip", "Una cuchara de madera", "Una goma elástica"], hint: "¿Cuál está hecho de acero?", explain: "Un clip está hecho de acero, así que el imán lo atrae." }
    ]
  },

  // ── Calle 3: Patio del Dragón ──
  'p3-castle-bell-casting': {
    title: "Fundir y moldear: cómo se hacen las campanas",
    topicName: "Fundirse y solidificarse",
    blurb: "Mira cómo la cera de las velas y el metal de las campanas se funden y vuelven a endurecerse, y mira cómo el hielo hace lo mismo en el laboratorio.",
    reading: [
      { title: "Sólido y líquido", text: "El calor hace que un sólido se funda y se vuelva líquido. Si enfrías el líquido, se solidifica y vuelve a ser sólido. El hielo se funde y se convierte en agua a 0 °C." },
      { title: "Velas", text: "Los castillos se iluminaban con velas. El calor de la llama funde la cera que hay cerca de la mecha, y la mecha absorbe ese líquido para que la llama siga encendida." },
      { title: "Fundir campanas", text: "Las campanas se hacen de bronce, una mezcla de cobre y estaño. Los campaneros lo calentaban a unos 1000 °C hasta que se fundía, y luego lo echaban en un molde con forma de campana." },
      { title: "Se pone duro", text: "Al enfriarse, el metal caliente se solidificaba y quedaba una campana sólida con la forma del molde. ¡Fundir y solidificar permite dar a los metales casi cualquier forma!" }
    ],
    sim: {
      predict: {
        q: "Calientas hielo que empieza a −10 °C. ¿A qué temperatura empezará a fundirse?",
        choices: ["−10 °C", "0 °C", "100 °C"],
        explain: "El hielo se funde a 0 °C. El bronce también se funde, ¡pero solo a unos 1000 °C!"
      }
    },
    quiz: [
      { q: "¿Qué le pasa a un sólido cuando lo calientas lo suficiente?", choices: ["Se funde y se vuelve líquido", "Se enfría", "Se convierte en una campana"], hint: "Piensa en el hielo al sol.", explain: "El calor funde un sólido y lo convierte en líquido." },
      { q: "¿A qué temperatura se funde el hielo?", choices: ["100 °C", "0 °C", "50 °C"], hint: "La misma temperatura a la que el agua se congela.", explain: "El hielo se funde a 0 °C." },
      { q: "¿De qué suelen estar hechas las campanas?", choices: ["De cristal", "De madera", "De bronce, una mezcla de cobre y estaño"], hint: "Una mezcla de metales muy fuerte.", explain: "Las campanas suelen estar hechas de bronce, una mezcla de cobre y estaño." },
      { q: "¿Cómo daban forma a una campana los campaneros?", choices: ["Echaban metal fundido en un molde y lo dejaban enfriar", "La tallaban en hielo", "La tejían"], hint: "Primero fundir, luego solidificar.", explain: "Fundían el bronce, lo echaban en un molde con forma de campana y lo dejaban enfriar hasta que se ponía duro." },
      { q: "¿Qué le pasa al metal líquido caliente cuando se enfría?", choices: ["Hierve", "Se solidifica", "Se va flotando"], hint: "Lo contrario de fundirse.", explain: "Al enfriarse, el metal líquido se solidifica." }
    ]
  },
  'p3-castle-hill-carts': {
    title: "Carretas en la colina del castillo",
    topicName: "El rozamiento",
    blurb: "Haz rodar carretas colina abajo sobre hielo, madera y moqueta, y descubre la fuerza que agarra: el rozamiento.",
    reading: [
      { title: "Arriba y abajo por la colina", text: "Las carretas llevaban pan, barriles y leña arriba y abajo por las calles empinadas del castillo. ¡Hacer que se pararan era tan importante como hacer que avanzaran!" },
      { title: "El rozamiento", text: "El rozamiento es una fuerza que frena las cosas que se deslizan o ruedan unas sobre otras. Las superficies ásperas tienen mucho rozamiento; las lisas, muy poco." },
      { title: "Resbala en invierno", text: "El hielo es muy liso, así que tiene poco rozamiento. La gente echaba arena o ceniza en los caminos helados para que los pies y las ruedas de las carretas agarraran más." },
      { title: "Las ruedas ayudan", text: "Arrastrar una carga pesada cuesta mucho por el rozamiento. Hacerla rodar sobre ruedas es mucho más fácil: ¡por eso las carretas tienen ruedas!" }
    ],
    sim: {
      predict: {
        q: "Una carretita de juguete baja por la rampa y llega al hielo, a la madera o a la moqueta. ¿En qué suelo rueda más lejos?",
        choices: ["La moqueta", "La madera", "El hielo"],
        explain: "El hielo es el más liso, con el menor rozamiento, así que la carreta rueda más lejos sobre él."
      }
    },
    quiz: [
      { q: "¿Qué es el rozamiento?", choices: ["Una fuerza que frena las cosas que se deslizan o ruedan", "Un tipo de carreta", "Un viento fuerte"], hint: "Hace que las cosas vayan más despacio.", explain: "El rozamiento es una fuerza que se opone a que las cosas se deslicen o rueden unas sobre otras." },
      { q: "¿Qué superficie tiene más rozamiento?", choices: ["El hielo", "Una moqueta áspera", "Un cristal pulido"], hint: "Las superficies ásperas agarran más.", explain: "De estas, la moqueta áspera es la que tiene más rozamiento." },
      { q: "¿Por qué la gente echaba arena en los caminos helados?", choices: ["Para que quedaran bonitos", "Para derretir el castillo", "Para que los pies y las ruedas agarraran más"], hint: "La arena es áspera.", explain: "La arena hacía el camino más áspero: más rozamiento y más agarre." },
      { q: "¿Por qué las carretas tienen ruedas?", choices: ["Rodar es mucho más fácil que arrastrar", "Las ruedas son bonitas", "Para poder flotar"], hint: "Arrastrar una carga pesada cuesta mucho.", explain: "Rodar sobre ruedas tiene mucho menos rozamiento que arrastrar, así que es más fácil." },
      { q: "Una carreta llega rodando a un suelo liso. ¿Qué pasa?", choices: ["Se para enseguida", "Rueda mucho rato, porque hay poco rozamiento", "Rueda hacia atrás"], hint: "Liso quiere decir poco rozamiento.", explain: "Con poco rozamiento que la frene, rueda mucho." }
    ]
  },

  // ── Calle 4: Paseo del Campanario ──
  'p4-castle-drawbridge': {
    title: "Levantar el puente levadizo",
    topicName: "Palancas y contrapesos",
    blurb: "Equilibra pesos en una palanca y mira cómo un contrapeso levanta un puente levadizo pesado.",
    reading: [
      { title: "Una palanca", text: "Una palanca es una barra que gira sobre un punto llamado punto de apoyo. Empuja hacia abajo un extremo y el otro sube, como en un balancín." },
      { title: "Más lejos, más fuerza", text: "Un peso lejos del punto de apoyo hace girar la palanca más que el mismo peso cerca. Así, un peso pequeño lejos puede equilibrar un peso grande cerca." },
      { title: "El puente levadizo", text: "Algunos puentes levadizos se construían como un balancín: cuando el puente bajaba, un contrapeso pesado en el otro extremo subía, y los dos casi se equilibraban." },
      { title: "Levantar sin esfuerzo", text: "Como el contrapeso hacía casi todo el trabajo, los guardias solo necesitaban un empujoncito para subir el puente pesado. Algunos puentes modernos todavía se levantan así." }
    ],
    sim: {
      predict: {
        q: "Un peso de 4 kg está a 2 pasos del punto de apoyo, a la izquierda. ¿Dónde hay que poner un peso de 2 kg a la derecha para equilibrarlo?",
        choices: ["A 2 pasos", "A 4 pasos", "A 1 paso"],
        explain: "4 kg × 2 pasos = 8, y 2 kg × 4 pasos = 8. La mitad de peso necesita el doble de distancia."
      }
    },
    quiz: [
      { q: "¿Cómo se llama el punto sobre el que gira una palanca?", choices: ["El punto de apoyo", "El mango", "El puente levadizo"], hint: "Es el punto sobre el que gira la barra.", explain: "Una palanca gira sobre un punto llamado punto de apoyo." },
      { q: "Un peso pequeño puede equilibrar uno grande si está…", choices: ["Más cerca del punto de apoyo", "Más lejos del punto de apoyo", "Encima del grande"], hint: "Más lejos, más fuerza.", explain: "Un peso lejos del punto de apoyo hace girar más la palanca." },
      { q: "¿Qué hacía el contrapeso de un puente levadizo?", choices: ["Lo hacía más pesado de levantar", "Sostenía el castillo", "Equilibraba el puente para que fuera fácil levantarlo"], hint: "Piensa en un balancín.", explain: "El contrapeso casi equilibraba el puente, así que bastaba con un empujoncito." },
      { q: "Un peso de 6 kg está a 1 paso del punto de apoyo. ¿Dónde hay que poner un peso de 3 kg al otro lado para equilibrarlo?", choices: ["A 2 pasos", "A 3 pasos", "A 6 pasos"], hint: "6 × 1 = 3 × ?", explain: "6 × 1 = 6 y 3 × 2 = 6, así que a 2 pasos." },
      { q: "¿Cuál de estas cosas es una palanca?", choices: ["Un balancín", "Una pelota", "Una ventana"], hint: "Una barra que gira sobre un punto de apoyo.", explain: "Un balancín es una palanca: una barra que gira sobre un punto de apoyo en el medio." }
    ]
  },
  'p4-castle-lightning-rod': {
    title: "Los rayos y las torres altas",
    topicName: "Conductores y aislantes",
    blurb: "Descubre qué cosas dejan pasar la electricidad y cómo una barra de metal protege de los rayos a las torres altas.",
    reading: [
      { title: "Una chispa gigante", text: "Un rayo es una chispa gigante de electricidad que salta entre una nube y el suelo. Suele caer sobre lo más alto que haya alrededor, como torres y árboles." },
      { title: "Conductores", text: "La electricidad pasa con facilidad por metales como el cobre, el hierro y el aluminio. Se llaman conductores." },
      { title: "Aislantes", text: "La goma, el plástico, la madera seca y el cristal no dejan pasar bien la electricidad. Se llaman aislantes, y nos protegen de las descargas eléctricas." },
      { title: "El pararrayos", text: "En la década de 1750, Benjamin Franklin propuso poner una barra de metal en lo alto de los edificios altos, unida por una tira de metal hasta el suelo. El rayo baja por el metal sin peligro, en vez de dañar la torre." }
    ],
    sim: {
      predict: {
        q: "Cierras el hueco del circuito con un cable de cobre, y luego con una goma elástica. ¿Cuál enciende la bombilla?",
        choices: ["La goma elástica", "El cable de cobre", "Ninguno"],
        explain: "El cobre es conductor, así que la electricidad pasa por él y la bombilla se enciende. La goma es aislante."
      }
    },
    quiz: [
      { q: "¿Qué es un rayo?", choices: ["Una chispa gigante de electricidad", "Una estrella fugaz", "Un pájaro muy brillante"], hint: "Salta entre una nube y el suelo.", explain: "Un rayo es una chispa gigante de electricidad." },
      { q: "¿Cuál de estos es un conductor?", choices: ["Una goma elástica", "Un cable de cobre", "Una pajita de plástico"], hint: "Los metales dejan pasar la electricidad.", explain: "El cobre es un metal y un buen conductor." },
      { q: "¿Cuál de estos es un aislante?", choices: ["Papel de aluminio", "Un clavo de hierro", "Un palito de madera"], hint: "No deja pasar bien la electricidad.", explain: "La madera seca es aislante." },
      { q: "¿Qué hace un pararrayos?", choices: ["Lleva el rayo sin peligro hasta el suelo", "Fabrica rayos", "Aleja la lluvia"], hint: "Está unido al suelo por metal.", explain: "Le da al rayo un camino de metal seguro hasta el suelo." },
      { q: "¿Quién propuso el pararrayos en la década de 1750?", choices: ["Benjamin Franklin", "El rey Juan", "Fibonacci"], hint: "Un inventor y escritor estadounidense.", explain: "Benjamin Franklin propuso el pararrayos en la década de 1750." }
    ]
  },

  // ── Calle 5: Jardín del Reloj de Sol ──
  'p5-castle-pendulum-clock': {
    title: "El reloj de péndulo",
    topicName: "Los relojes de péndulo",
    blurb: "Descubre cómo un peso que se balancea hizo los relojes mucho más exactos, y prueba péndulos en el taller.",
    reading: [
      { title: "Relojes despistados", text: "Los primeros relojes de torre funcionaban con pesas que bajaban. Eran ingeniosos, pero podían adelantarse o atrasarse un cuarto de hora cada día." },
      { title: "La lámpara de Galileo", text: "Cuenta la historia que, en la década de 1580, el joven Galileo miraba una lámpara que se balanceaba en la catedral de Pisa. Se dio cuenta de que cada balanceo tardaba lo mismo, fuera grande o pequeño." },
      { title: "El reloj de Huygens", text: "En 1656, Christiaan Huygens construyó el primer reloj de péndulo. El péndulo llevaba el ritmo tan bien que pronto los mejores relojes solo se equivocaban unos diez segundos al día." },
      { title: "La longitud importa", text: "Lo que tarda un péndulo en balancearse depende de su longitud, no de su peso. Un péndulo más largo se balancea más despacio. El péndulo del Big Ben mide unos 4 m y tarda 2 segundos en cada balanceo." }
    ],
    sim: {
      predict: {
        q: "Alargas la cuerda del péndulo y dejas el mismo peso. ¿Qué le pasa al tiempo de cada balanceo?",
        choices: ["Se hace más corto", "Sigue igual", "Se hace más largo"],
        explain: "Un péndulo más largo se balancea más despacio, así que cada balanceo tarda más. Los relojeros ajustan la velocidad de un reloj cambiando la longitud del péndulo."
      }
    },
    quiz: [
      { q: "¿Quién construyó el primer reloj de péndulo, en 1656?", choices: ["Christiaan Huygens", "Leonardo da Vinci", "El rey Sejong"], hint: "Un científico neerlandés.", explain: "Christiaan Huygens construyó el primer reloj de péndulo en 1656." },
      { q: "¿De qué se dio cuenta Galileo al ver la lámpara balancearse?", choices: ["De que estaba ardiendo", "De que cada balanceo tardaba lo mismo", "De que se balanceaba cada vez más rápido"], hint: "Balanceos grandes y balanceos pequeños…", explain: "Se dio cuenta de que cada balanceo tardaba lo mismo, grande o pequeño." },
      { q: "¿Qué cambia lo que tarda un péndulo en balancearse?", choices: ["Su color", "Su peso", "Su longitud"], hint: "¡El peso no!", explain: "El tiempo del balanceo depende de la longitud del péndulo, no de su peso." },
      { q: "Por culpa de su péndulo, un reloj va demasiado lento. ¿Qué debe hacer el relojero?", choices: ["Acortar el péndulo", "Alargar el péndulo", "Pintarlo de dorado"], hint: "Los péndulos más cortos se balancean más rápido.", explain: "Un péndulo más corto se balancea más rápido, así que el reloj se acelera." },
      { q: "¿Por qué los relojes de péndulo eran mejores que los primeros relojes de torre?", choices: ["Daban la hora con mucha más exactitud", "Sonaban más fuerte", "No necesitaban números"], hint: "El péndulo lleva un ritmo constante.", explain: "Un péndulo lleva un ritmo constante, así que los relojes daban la hora mucho mejor." }
    ]
  },
  'p5-castle-messenger-birds': {
    title: "Palomas mensajeras: ¿a qué velocidad?",
    topicName: "Velocidad, distancia y tiempo",
    blurb: "Envía mensajes con palomas y haz carreras de carretas para ver cómo encajan la velocidad, la distancia y el tiempo.",
    reading: [
      { title: "Volver a casa", text: "Las palomas mensajeras saben volver a casa desde muy lejos. Desde hace miles de años, la gente las usa para llevar mensajitos atados a las patas." },
      { title: "¿A qué velocidad?", text: "Una paloma mensajera puede volar a unos 80 km por hora, mucho más rápido de lo que un caballo puede galopar durante mucho rato." },
      { title: "Distancia = velocidad × tiempo", text: "Si una paloma vuela a 80 km por hora durante 2 horas, recorre 80 × 2 = 160 km." },
      { title: "Tiempo = distancia ÷ velocidad", text: "Para saber cuánto dura un viaje, divide la distancia entre la velocidad. 240 km a 80 km por hora son 240 ÷ 80 = 3 horas." }
    ],
    sim: {
      predict: {
        q: "En el taller, la carreta A va a 3 m/s y la carreta B a 6 m/s. Corren durante 5 segundos. ¿Cuánto recorre la carreta B?",
        choices: ["15 m", "30 m", "11 m"],
        explain: "Distancia = velocidad × tiempo = 6 × 5 = 30 m. La carreta A solo recorre 3 × 5 = 15 m."
      }
    },
    quiz: [
      { q: "Más o menos, ¿a qué velocidad puede volar una paloma mensajera?", choices: ["A unos 80 km por hora", "A unos 8 km por hora", "A unos 800 km por hora"], hint: "Más rápido que un caballo al galope.", explain: "Una paloma mensajera puede volar a unos 80 km por hora." },
      { q: "Una paloma vuela a 80 km por hora durante 3 horas. ¿Cuánto recorre?", choices: ["83 km", "240 km", "160 km"], hint: "Distancia = velocidad × tiempo.", explain: "80 × 3 = 240 km." },
      { q: "Un mensaje tiene que recorrer 160 km. Una paloma vuela a 80 km por hora. ¿Cuánto tardará?", choices: ["4 horas", "1 hora", "2 horas"], hint: "Tiempo = distancia ÷ velocidad.", explain: "160 ÷ 80 = 2 horas." },
      { q: "Un jinete va a 20 km por hora durante 4 horas. ¿Cuánto recorre?", choices: ["80 km", "24 km", "5 km"], hint: "20 × 4", explain: "20 × 4 = 80 km." },
      { q: "Dos palomas vuelan durante el mismo tiempo. Una vuela el doble de rápido. ¿Cuánto recorre?", choices: ["El doble", "La mitad", "La misma distancia"], hint: "Distancia = velocidad × tiempo.", explain: "El doble de velocidad durante el mismo tiempo es el doble de distancia." }
    ]
  },

  // ── Calle 6: Bastión de los Globos ──
  'p6-castle-rainbows': {
    title: "Arcoíris junto a las cascadas",
    topicName: "El arcoíris y la luz",
    blurb: "Descubre cómo la luz del sol y las gotas de agua forman arcoíris, y haz rebotar rayos de luz en espejos.",
    reading: [
      { title: "La luz blanca son muchos colores", text: "La luz del sol parece blanca, pero en realidad es una mezcla de colores. En 1666, Isaac Newton empezó a demostrarlo con un prisma, un bloque de cristal que abre la luz en un arcoíris." },
      { title: "La luz se tuerce", text: "Cuando la luz del sol entra en una gota de agua, se tuerce. Cada color se tuerce un poquito distinto, así que los colores se separan: rojo, naranja, amarillo, verde, azul, añil y violeta." },
      { title: "Un rebote dentro", text: "Dentro de la gota, la luz rebota en la parte de atrás, como en un espejo, y vuelve a salir hacia ti. Millones de gotas juntas forman un arcoíris." },
      { title: "Dónde mirar", text: "Para ver un arcoíris, ponte de espaldas al Sol y mira hacia la lluvia o hacia las gotitas de una cascada. ¡Por eso las cascadas del Castillo del Cielo están llenas de arcoíris los días de sol!" }
    ],
    sim: {
      predict: {
        q: "Un rayo de luz llega al espejo a 35° de la normal. ¿Con qué ángulo respecto a la normal rebotará?",
        choices: ["35°", "70°", "0°"],
        explain: "La luz rebota en un espejo con el mismo ángulo con el que llega: 35°. Así rebota también la luz en la parte de atrás de cada gota de lluvia."
      }
    },
    quiz: [
      { q: "¿De qué está hecha en realidad la luz del sol?", choices: ["De una mezcla de todos los colores", "Solo de luz amarilla", "De soles diminutos"], hint: "Un prisma la abre.", explain: "La luz blanca del sol es una mezcla de todos los colores del arcoíris." },
      { q: "¿Qué le pasa a la luz cuando entra en una gota de agua?", choices: ["Desaparece", "Se tuerce y los colores se separan", "Se congela"], hint: "Cada color se tuerce un poquito distinto.", explain: "La luz se tuerce al entrar en la gota, y cada color se tuerce de forma un poco diferente." },
      { q: "¿Dónde tiene que estar el Sol cuando buscas un arcoíris?", choices: ["Delante de ti", "Justo encima de ti", "Detrás de ti"], hint: "Mira hacia la lluvia, de espaldas al Sol.", explain: "Ponte de espaldas al Sol y mira hacia la lluvia o las gotitas." },
      { q: "Un rayo llega a un espejo a 20° de la normal. ¿Con qué ángulo rebota?", choices: ["20°", "40°", "90°"], hint: "El ángulo de entrada es igual al ángulo de salida.", explain: "Rebota a 20°, el mismo ángulo con el que llegó." },
      { q: "¿Quién demostró con un prisma que la luz blanca es una mezcla de colores?", choices: ["Isaac Newton", "Hildegarda de Bingen", "Christiaan Huygens"], hint: "También estudió la gravedad.", explain: "Isaac Newton lo demostró con prismas, a partir de 1666." }
    ]
  },
  'p6-castle-parachutes': {
    title: "Bajar flotando: paracaídas y aire",
    topicName: "La resistencia del aire",
    blurb: "Deja caer una hoja de papel lisa y una bola de papel arrugado, y descubre cómo los paracaídas frenan una caída.",
    reading: [
      { title: "El aire empuja", text: "Cuando algo cae, tiene que apartar el aire de su camino. El aire empuja en sentido contrario. Ese empuje se llama resistencia del aire." },
      { title: "Más grande, más lento", text: "Cuanta más superficie extiende algo contra el aire, más resistencia recibe. Un paracaídas se abre mucho para atrapar mucho aire, así que cae despacio." },
      { title: "Los primeros paracaídas", text: "Hacia 1485, Leonardo da Vinci dibujó un paracaídas con forma de pirámide. En 1783, Louis-Sébastien Lenormand saltó desde una torre en Francia agarrado a un paracaídas, y le dio su nombre." },
      { title: "Semillas y plumas", text: "La naturaleza también usa la resistencia del aire: las semillas del diente de león flotan con paracaídas diminutos, y los pájaros abren bien las alas y la cola para bajar planeando con suavidad." }
    ],
    sim: {
      predict: {
        q: "Dejas caer a la vez una hoja de papel lisa y una bola hecha con el mismo papel arrugado. ¿Cuál llega primero al suelo?",
        choices: ["La hoja lisa", "La bola arrugada", "Llegan a la vez"],
        explain: "La hoja lisa se extiende y atrapa mucho aire, así que la resistencia del aire la frena. La bola arrugada tiene poca resistencia y cae rápido."
      }
    },
    quiz: [
      { q: "¿Qué es la resistencia del aire?", choices: ["El empuje del aire contra algo que se mueve a través de él", "Un tipo de tormenta", "Una muralla del castillo"], hint: "El aire empuja en sentido contrario.", explain: "La resistencia del aire es el aire empujando contra algo que se mueve a través de él." },
      { q: "¿Por qué un paracaídas cae despacio?", choices: ["Es muy pesado", "Se abre mucho y atrapa mucho aire", "Está hecho de plumas"], hint: "Más superficie, más resistencia.", explain: "Un paracaídas se abre mucho, así que el aire lo empuja con fuerza en sentido contrario." },
      { q: "¿Quién dibujó un paracaídas con forma de pirámide hacia 1485?", choices: ["Isaac Newton", "Benjamin Franklin", "Leonardo da Vinci"], hint: "También pintó la Mona Lisa.", explain: "Leonardo da Vinci dibujó un paracaídas con forma de pirámide hacia 1485." },
      { q: "En un lugar sin nada de aire, se dejan caer a la vez una pluma y una pelota. ¿Qué pasa?", choices: ["Llegan a la vez", "La pluma sube flotando", "La pluma llega primero"], hint: "Sin aire, no hay resistencia del aire.", explain: "Sin aire no hay resistencia del aire, así que caen juntas." },
      { q: "¿Cómo usan las semillas del diente de león la resistencia del aire?", choices: ["Bajan flotando despacio con paracaídas diminutos", "Ruedan por el suelo", "Nadan"], hint: "¡Sopla un diente de león!", explain: "Cada semilla tiene un penacho esponjoso que atrapa el aire como un paracaídas diminuto." }
    ]
  },

  // ── Calle 7: Jardín de la Corona ──
  'p7-castle-air-pressure': {
    title: "Cocinar en las nubes: la presión del aire en las alturas",
    topicName: "La presión del aire y la ebullición",
    blurb: "Descubre por qué el aire se vuelve más fino en las alturas y por qué el agua hierve a menos temperatura en una montaña.",
    reading: [
      { title: "Un mar de aire", text: "Vivimos en el fondo de un océano profundo de aire. Todo ese aire que tenemos encima aprieta hacia abajo sobre todas las cosas: eso es la presión del aire." },
      { title: "Más fino en las alturas", text: "Cuanto más alto subes, menos aire tienes encima, así que la presión del aire es menor y el aire es más fino. En la cima del Everest, la presión es solo más o menos un tercio de la que hay a nivel del mar." },
      { title: "Hervir a menos temperatura", text: "A nivel del mar, el agua hierve a 100 °C. Con menos aire apretando encima, hierve a menos temperatura: a unos 90 °C a 3000 m, y solo a unos 70 °C en la cima del Everest." },
      { title: "Pasta lenta", text: "El agua que hierve a 90 °C no está tan caliente, así que la comida tarda más en hacerse. En lo alto de las montañas, la gente usa ollas a presión, que guardan el vapor dentro para que el agua se caliente más." }
    ],
    sim: {
      predict: {
        q: "En el taller, a nivel del mar, sigues calentando un vaso de precipitados con agua. ¿A qué temperatura empezará a hervir?",
        choices: ["70 °C", "100 °C", "0 °C"],
        explain: "A nivel del mar, el agua hierve a 100 °C. En un castillo entre las nubes, con menos presión del aire, herviría a menos temperatura."
      }
    },
    quiz: [
      { q: "¿Qué es la presión del aire?", choices: ["El empuje de todo el aire que tenemos encima", "Un tipo de instrumento de viento", "El olor del aire"], hint: "Vivimos en el fondo de un océano de aire.", explain: "La presión del aire es el empuje del aire que aprieta hacia abajo sobre todas las cosas." },
      { q: "¿Qué le pasa al aire cuando subes una montaña?", choices: ["Se vuelve más espeso", "Se vuelve más fino, con menos presión", "Se convierte en agua"], hint: "Tienes menos aire encima.", explain: "Tienes menos aire encima, así que la presión es menor y el aire es más fino." },
      { q: "¿A qué temperatura hierve el agua a nivel del mar?", choices: ["0 °C", "70 °C", "100 °C"], hint: "El punto de ebullición de siempre.", explain: "A nivel del mar, el agua hierve a 100 °C." },
      { q: "Más o menos, ¿a qué temperatura hierve el agua en la cima del Everest?", choices: ["A unos 70 °C", "A unos 150 °C", "A unos 100 °C"], hint: "Allí arriba aprieta mucho menos aire.", explain: "En la cima del Everest, el agua hierve a solo unos 70 °C." },
      { q: "¿Por qué la gente que vive en lo alto de las montañas usa ollas a presión?", choices: ["Para que el agua se caliente más y la comida se haga antes", "Para que la comida esté fría", "Para que la comida pese menos"], hint: "Guardar el vapor dentro sube la presión.", explain: "Una olla a presión guarda el vapor dentro y sube la presión, así que el agua se calienta más antes de hervir." }
    ]
  },
  'p7-castle-water-mills': {
    title: "Cascadas, molinos y energía",
    topicName: "La energía y los molinos",
    blurb: "Mira cómo el agua que cae y el viento que sopla hacían girar las piedras de molino, y sigue la energía en un péndulo que se balancea.",
    reading: [
      { title: "La energía cambia", text: "La energía puede cambiar de un tipo a otro. El agua que está en lo alto tiene energía guardada. Al caer, esa energía guardada se convierte en energía de movimiento." },
      { title: "Molinos de agua", text: "Un molino de agua usa el agua que cae o que corre para hacer girar una gran rueda. La rueda mueve las piedras de molino que muelen el grano y lo convierten en harina. En 1086, un censo de Inglaterra contó unos 5600 molinos de agua." },
      { title: "Molinos de viento", text: "Donde no había un río rápido, la gente construía molinos de viento. El viento hace girar las aspas, y las aspas mueven las piedras de molino. Hoy los aerogeneradores usan la misma idea para producir electricidad." },
      { title: "El péndulo que se balancea", text: "Un péndulo también intercambia energía: en lo más alto de su balanceo, su energía está guardada, y abajo del todo es toda movimiento, así que ahí es donde va más rápido." }
    ],
    sim: {
      predict: {
        q: "Echas el péndulo más arriba antes de soltarlo. ¿Qué pasa abajo del todo de su balanceo?",
        choices: ["Va más rápido", "Va más despacio", "Se para"],
        explain: "Empezar más arriba le da más energía guardada, que se convierte en más movimiento abajo. El agua que cae desde más alto también hace girar con más fuerza la rueda de un molino."
      }
    },
    quiz: [
      { q: "¿Qué tipo de energía tiene el agua en lo alto de una cascada?", choices: ["Energía guardada, porque está en lo alto", "Ninguna energía", "Solo energía sonora"], hint: "Puede caer desde muy alto.", explain: "El agua que está en lo alto tiene energía guardada, que se convierte en movimiento al caer." },
      { q: "¿Qué hacía normalmente un molino de agua?", choices: ["Tocar campanas", "Moler grano para hacer harina", "Hacer hielo"], hint: "Piensa en un molinero y en el pan.", explain: "La rueda de agua movía las piedras de molino que molían el grano para hacer harina." },
      { q: "¿Dónde va más rápido un péndulo que se balancea?", choices: ["En lo más alto del balanceo", "A media altura", "Abajo del todo del balanceo"], hint: "Toda su energía guardada se ha convertido en movimiento.", explain: "Abajo del todo, toda su energía es movimiento, así que ahí va más rápido." },
      { q: "Más o menos, ¿cuántos molinos de agua contó un censo de Inglaterra en 1086?", choices: ["Unos 5600", "Unos 5", "Unos 5 millones"], hint: "¡Muchísimos, para un país sin motores!", explain: "El censo, llamado Libro Domesday, contó unos 5600 molinos de agua." },
      { q: "¿Qué producen los aerogeneradores modernos?", choices: ["Electricidad", "Harina", "Nubes"], hint: "Dan energía a las casas.", explain: "Los aerogeneradores usan el viento para producir electricidad." }
    ]
  }
};
