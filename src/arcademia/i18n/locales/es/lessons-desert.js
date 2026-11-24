/** Español — The Desert of the Pyramids' lessons (overlay on content/desert.js; text only). */
export default {
  // ───────── Matemáticas del desierto (Escuela Pirámide) ─────────
  // ── Oasis 1: Puerta de la Esfinge ──
  'm1-desert-camel-count': {
    title: "Contar camellos", topicName: "Contar", blurb: "Cuenta los camellos de la Puerta de la Esfinge, de uno en uno y de cinco en cinco.",
    reading: [
      { title: "Una fila de camellos", text: "Una caravana de camellos ha llegado al oasis. Toca cada camello una vez y di un número. El último número que dices es cuántos camellos hay." },
      { title: "De cinco en cinco", text: "Los camellos están atados en filas de 5. Cuenta las filas: 5, 10, 15, 20. ¡Es mucho más rápido que contar de uno en uno!" },
      { title: "No cuentes dos veces", text: "Aparta cada dátil a un lado cuando lo cuentes. Así nunca cuentas un dátil dos veces y nunca te saltas ninguno." }
    ],
    quiz: [
      { q: "¿Cuántos camellos hay junto al pozo? 🐪🐪🐪🐪🐪🐪", choices: ["5", "6", "7"], hint: "Toca cada camello una vez mientras cuentas.", explain: "1, 2, 3, 4, 5, 6. Hay 6 camellos." },
      { q: "Hay 3 filas de 5 palmeras. ¿Cuántas palmeras son?", choices: ["8", "20", "15"], hint: "Cuenta de cinco en cinco: 5, 10, …", explain: "5, 10, 15. Tres filas de 5 son 15 palmeras." },
      { q: "Cuenta las palmeras: 🌴🌴🌴🌴🌴🌴🌴🌴🌴🌴🌴. ¿Cuántas hay?", choices: ["11", "10", "12"], hint: "Cuenta las 10 primeras y luego sigue contando.", explain: "10, y luego 11. Hay 11 palmeras." },
      { q: "Sami cuenta los camellos: 15, 16, 17. ¿Qué número va después?", choices: ["16", "20", "18", "19"], hint: "¿Qué número va justo después del 17?", explain: "Después del 17 va el 18." },
      { q: "Nala pone sus dátiles en 4 montones de 5. ¿Cuántos dátiles tiene?", choices: ["20", "9", "25"], hint: "Cuenta de cinco en cinco, 4 veces.", explain: "5, 10, 15, 20. Cuatro montones de 5 son 20 dátiles." }
    ]
  },
  'm1-desert-oasis-dates': {
    title: "Dátiles en el oasis", topicName: "Sumas hasta 10", blurb: "Caen dátiles dulces de las palmeras. ¿Cuántos hay ahora?",
    reading: [
      { title: "Júntalos", text: "Sumar es juntar grupos. ¡4 dátiles y 2 dátiles más son 6 dátiles!" },
      { title: "Pasos de camello", text: "Empieza en el primer número de la recta numérica. Da un paso hacia delante por cada uno que sumas. Donde te paras, esa es la respuesta." },
      { title: "Primero el número grande", text: "2 + 7 es lo mismo que 7 + 2. Empieza por el número más grande: ¡así das menos pasos!" }
    ],
    quiz: [
      { q: "Hay 4 dátiles en un cuenco. Caen 3 más de la palmera. ¿Cuántos dátiles hay ahora en el cuenco?", choices: ["6", "8", "7"], hint: "Empieza en el 4 y avanza 3.", explain: "4 + 3 = 7. Hay 7 dátiles." },
      { q: "5 camellos beben en el pozo. Llegan 4 camellos más. ¿Cuántos camellos hay en el pozo?", choices: ["9", "8", "10"], hint: "Empieza en el 5 y avanza 4.", explain: "5 + 4 = 9. Hay 9 camellos." },
      { q: "2 suricatas están de pie sobre una roca. Asoman 8 suricatas más. ¿Cuántas suricatas hay?", choices: ["6", "10", "9"], hint: "Empieza por el número más grande, el 8, y avanza 2.", explain: "8 + 2 = 10, y 2 + 8 = 10 también. Hay 10 suricatas." },
      { q: "En una barca hay 6 personas. Se sube 1 persona más. ¿Cuántas personas hay en la barca?", choices: ["5", "8", "16", "7"], hint: "Uno más que 6.", explain: "6 + 1 = 7. Hay 7 personas en la barca." },
      { q: "Amir tiene 3 piedras brillantes. Encuentra 3 más. ¿Cuántas piedras tiene ahora?", choices: ["6", "5", "33"], hint: "Empieza en el 3 y avanza 3.", explain: "3 + 3 = 6. Amir tiene 6 piedras." }
    ]
  },

  // ── Oasis 2: Mercado de Camellos ──
  'm2-desert-hieroglyph-numbers': {
    title: "Números jeroglíficos", topicName: "Valor posicional", blurb: "Escribe números como los antiguos egipcios, con palitos y arcos.",
    reading: [
      { title: "Números egipcios", text: "Hace mucho tiempo, los egipcios escribían el 1 como un palito: |. Escribían el 10 con forma de arco: ∩. Así que ∩∩||| quiere decir 2 decenas y 3 unidades: 23." },
      { title: "Signos más grandes", text: "Tenían más signos para los números grandes: una cuerda enrollada para el 100 y una flor de loto para el 1000. ¡Un número grande usaba muchos signos!" },
      { title: "Nuestros números usan casas", text: "Nosotros usamos casas. En 46, el 4 está en la casa de las decenas, así que vale 40. El 6 está en la casa de las unidades, así que vale 6. ¡46 y 64 son números diferentes!" }
    ],
    quiz: [
      { q: "Un egipcio escribió ∩∩∩∩∩|||. ¿Qué número es?", choices: ["35", "53", "8"], hint: "Cada ∩ vale 10 y cada | vale 1.", explain: "5 arcos son 5 decenas (50) y 3 palitos son 3 unidades. 50 + 3 = 53." },
      { q: "Un comerciante tiene 72 dátiles. ¿Cuántas decenas hay en 72?", choices: ["7", "2", "9"], hint: "Mira la casa de las decenas: la primera cifra.", explain: "72 son 7 decenas y 2 unidades, así que hay 7 decenas." },
      { q: "¿Qué número egipcio quiere decir 26?", choices: ["∩∩∩∩∩∩||", "∩||||||", "∩∩||||||"], hint: "26 son 2 decenas y 6 unidades.", explain: "2 arcos (∩∩) para las 2 decenas y 6 palitos (||||||) para las 6 unidades forman 26." },
      { q: "En 48, ¿qué significa el 4?", choices: ["4 unidades", "4 decenas", "4 centenas"], hint: "El 4 está en la casa de las decenas.", explain: "En 48, el 4 significa 4 decenas (40) y el 8 significa 8 unidades." },
      { q: "Los egipcios dibujaban una cuerda enrollada para el 100. ¿Cuántas decenas forman 100?", choices: ["100", "1", "5", "10"], hint: "Cuenta de diez en diez: 10, 20, 30…", explain: "10, 20, 30, 40, 50, 60, 70, 80, 90, 100. Diez decenas forman 100." }
    ]
  },
  'm2-desert-market-adding': {
    title: "Sumar en el Mercado de Camellos", topicName: "Suma en columnas", blurb: "Suma en columnas los sacos y las cestas de los comerciantes, y llévate la decena.",
    reading: [
      { title: "Ponlos en fila", text: "En el Mercado de Camellos, los comerciantes suman sus mercancías. Escribe los números uno debajo del otro: unidades debajo de unidades y decenas debajo de decenas." },
      { title: "Primero las unidades", text: "Suma siempre primero la columna de las unidades. Si las unidades suman 10 o más, ¡has formado una decena nueva!" },
      { title: "Llévate la decena", text: "Escribe abajo la cifra de las unidades. Lleva esa decena (un 1) arriba de la columna de las decenas y súmala con las otras decenas." }
    ],
    quiz: [
      { q: "Una comerciante tiene 27 sacos de grano. Compra 15 más. ¿Cuántos sacos tiene ahora?", choices: ["32", "42", "312"], hint: "7 + 5 = 12, así que te llevas una decena.", explain: "Unidades: 7 + 5 = 12, escribes 2 y te llevas 1. Decenas: 2 + 1 + 1 = 4. El resultado es 42." },
      { q: "Por la mañana hay 38 camellos en el mercado. A mediodía llegan 24 más. ¿Cuántos camellos hay?", choices: ["62", "52", "512"], hint: "8 + 4 = 12. Escribe 2 y llévate 1.", explain: "Unidades: 8 + 4 = 12, escribes 2 y te llevas 1. Decenas: 3 + 2 + 1 = 6. Hay 62 camellos." },
      { q: "Un vendedor de cestas vende 46 cestas el lunes y 37 el martes. ¿Cuántas son?", choices: ["73", "713", "83"], hint: "6 + 7 = 13. Llévate la decena.", explain: "Unidades: 6 + 7 = 13, escribes 3 y te llevas 1. Decenas: 4 + 3 + 1 = 8. Son 83 cestas." },
      { q: "Dos caravanas traen 19 bolsas de sal cada una. ¿Cuántas bolsas son?", choices: ["28", "39", "29", "38"], hint: "19 + 19: 9 + 9 = 18.", explain: "Unidades: 9 + 9 = 18, escribes 8 y te llevas 1. Decenas: 1 + 1 + 1 = 3. Son 38 bolsas." },
      { q: "Cuando la columna de las unidades suma 10 o más, ¿qué haces?", choices: ["Te llevas una decena a la columna de las decenas", "Empiezas otra vez", "Lo dejas fuera"], hint: "Diez unidades forman una decena.", explain: "Diez unidades forman una decena nueva, así que te la llevas y la sumas en la columna de las decenas." }
    ]
  },

  // ── Oasis 3: Puerto de las Falucas ──
  'm3-desert-brick-rows': {
    title: "Filas de adobes", topicName: "Tablas de multiplicar", blurb: "Los constructores apilan en filas adobes secados al sol. Multiplica para contarlos.",
    reading: [
      { title: "Ladrillos del río", text: "Los egipcios hacían ladrillos con barro del Nilo mezclado con paja. Les daban forma en moldes de madera y los secaban al sol: eran adobes. Los colocaban en filas ordenadas. 3 filas de 6 ladrillos son 3 × 6 = 18 ladrillos." },
      { title: "Dale la vuelta", text: "Gira las filas de lado y tendrás 6 filas de 3. ¡Siguen siendo 18! Así que 3 × 6 = 6 × 3." },
      { title: "Cuenta a saltos", text: "Para hallar 4 × 7, cuenta de siete en siete 4 veces: 7, 14, 21, 28." }
    ],
    quiz: [
      { q: "Un constructor pone a secar 4 filas de 6 ladrillos. ¿Cuántos ladrillos son?", choices: ["10", "24", "20"], hint: "4 filas de 6 es 4 × 6.", explain: "4 × 6 = 24. Hay 24 ladrillos." },
      { q: "Hay 3 barcos en el puerto, con 7 marineros en cada barco. ¿Cuántos marineros hay?", choices: ["21", "10", "24"], hint: "Cuenta de siete en siete 3 veces.", explain: "3 × 7 = 21. Hay 21 marineros." },
      { q: "Un muro tiene 5 filas de 5 ladrillos. ¿Cuántos ladrillos hay en el muro?", choices: ["10", "20", "25"], hint: "5 filas de 5 es 5 × 5.", explain: "5 × 5 = 25. Hay 25 ladrillos." },
      { q: "¿Qué es lo mismo que 8 × 3?", choices: ["8 + 3", "3 × 8", "8 × 8"], hint: "Dale la vuelta a las filas.", explain: "8 × 3 = 3 × 8 = 24. Si cambias el orden de los números, el resultado es el mismo." },
      { q: "Una faluca tiene 9 filas de asientos con 2 asientos en cada fila. ¿Cuántos asientos son?", choices: ["11", "16", "29", "18"], hint: "Cuenta de dos en dos 9 veces.", explain: "9 × 2 = 18. La faluca tiene 18 asientos." }
    ]
  },
  'm3-desert-sharing-loaves': {
    title: "Repartir panes", topicName: "Fracciones", blurb: "Reparte el pan de forma justa, como hacían las cuentas los escribas egipcios.",
    reading: [
      { title: "Partes justas", text: "Una fracción es una parte de un todo. A los trabajadores egipcios a menudo les pagaban con pan, ¡así que repartir los panes de forma justa era importante! Las partes tienen que ser iguales." },
      { title: "Arriba y abajo", text: "En 3/4, el número de abajo (4) dice cuántas partes iguales hay. El número de arriba (3) dice cuántas partes tenemos." },
      { title: "Fracciones egipcias", text: "A los escribas egipcios les gustaban las fracciones con un 1 arriba, como 1/2, 1/3 y 1/4. Un antiguo rollo de matemáticas, el papiro Rhind, tiene problemas sobre cómo repartir panes entre trabajadores." }
    ],
    quiz: [
      { q: "Un pan está cortado en 4 partes iguales. Kemi se come 1 parte. ¿Qué fracción del pan se comió?", choices: ["1/3", "1/4", "3/4"], hint: "¿Cuántas partes iguales hay? ¿Cuántas se comió?", explain: "Hay 4 partes iguales y Kemi se comió 1, así que se comió 1/4. Quedan los otros 3/4." },
      { q: "Un pan plano tiene 8 trozos iguales. 3 trozos tienen miel. ¿Qué fracción tiene miel?", choices: ["3/8", "5/8", "3/5"], hint: "El número de abajo es cuántos trozos hay en total.", explain: "3 de los 8 trozos iguales tienen miel, así que 3/8 tiene miel." },
      { q: "¿Qué es más grande: 1/2 de un pan o 1/3 del mismo pan?", choices: ["1/3", "Son iguales", "1/2"], hint: "Menos partes quiere decir trozos más grandes.", explain: "Si lo cortas en 2, cada trozo es más grande que si lo cortas en 3. Así que 1/2 es más grande que 1/3." },
      { q: "Un pan está cortado en 3 partes iguales. Se comen 2 partes. ¿Qué fracción queda?", choices: ["2/3", "1/3", "1/2"], hint: "¿Cuántas partes quedan de 3?", explain: "3 − 2 = 1 parte queda, así que queda 1/3 del pan." },
      { q: "A los escribas egipcios les gustaban las fracciones con un 1 arriba. ¿Cuál es así?", choices: ["3/5", "4/5", "2/5", "1/5"], hint: "Busca un 1 como número de arriba.", explain: "1/5 tiene un 1 arriba. Los escribas escribían casi todas las fracciones como 1/2, 1/3, 1/4, 1/5, etc." }
    ]
  },

  // ── Oasis 4: Plaza del Obelisco ──
  'm4-desert-cubits': {
    title: "Medir en codos", topicName: "2 cifras × 1 cifra", blurb: "Mide muros y obeliscos en codos y palmos, y multiplica separando en partes.",
    reading: [
      { title: "El codo real", text: "Los constructores egipcios medían en codos. Un codo real medía unos 52 cm, más o menos lo que mide el brazo de un adulto desde el codo hasta la punta de los dedos. Se dividía en 7 palmos, y cada palmo en 4 dedos." },
      { title: "Sepáralo en partes", text: "Un muro mide 14 codos. ¿Cuántos palmos son? 14 × 7 = 10 × 7 + 4 × 7 = 70 + 28 = 98 palmos." },
      { title: "Primero, estima", text: "29 × 3 debería dar cerca de 30 × 3 = 90. Si te sale 870, algo salió mal. ¡Compruébalo otra vez!" }
    ],
    quiz: [
      { q: "Un muro mide 12 codos. Cada codo son 7 palmos. ¿Cuántos palmos mide el muro?", choices: ["19", "84", "74"], hint: "12 es 10 y 2. Multiplica cada parte por 7.", explain: "10 × 7 = 70 y 2 × 7 = 14. 70 + 14 = 84 palmos." },
      { q: "Una cuerda mide 23 codos. ¿Cuánto miden 3 de estas cuerdas juntas?", choices: ["69 codos", "26 codos", "66 codos"], hint: "23 es 20 y 3. Multiplica cada parte por 3.", explain: "20 × 3 = 60 y 3 × 3 = 9. 60 + 9 = 69 codos." },
      { q: "Cada palmo son 4 dedos. ¿Cuántos dedos son 16 palmos?", choices: ["20", "48", "64"], hint: "16 es 10 y 6. Multiplica cada parte por 4.", explain: "10 × 4 = 40 y 6 × 4 = 24. 40 + 24 = 64 dedos." },
      { q: "Un templo tiene 6 filas de 24 columnas. ¿Cuántas columnas son?", choices: ["30", "124", "144", "126"], hint: "24 es 20 y 4. Multiplica cada parte por 6.", explain: "20 × 6 = 120 y 4 × 6 = 24. 120 + 24 = 144 columnas." },
      { q: "¿Cuál es la mejor estimación para 49 × 3?", choices: ["Unos 15", "Unos 150", "Unos 1500"], hint: "49 está cerca de 50.", explain: "49 está cerca de 50, y 50 × 3 = 150. El resultado exacto es 147." }
    ]
  },
  'm4-desert-caravan-loads': {
    title: "Repartir la carga de la caravana", topicName: "División", blurb: "Reparte sacos, dátiles y agua de forma justa entre camellos y viajeros.",
    reading: [
      { title: "Cargas justas", text: "Dividir es repartir en partes iguales. Una caravana tiene 32 sacos y 4 camellos. Cada camello lleva 32 ÷ 4 = 8 sacos, así que ningún camello lleva demasiado." },
      { title: "Lo contrario de multiplicar", text: "La división deshace la multiplicación. 4 × 8 = 32, así que 32 ÷ 4 = 8 y 32 ÷ 8 = 4." },
      { title: "Usa tus tablas", text: "Para hallar 54 ÷ 6, pregúntate: ¿qué número por 6 da 54? Es el 9." }
    ],
    quiz: [
      { q: "Una caravana tiene 32 sacos de sal y 4 camellos. Cada camello lleva el mismo número. ¿Cuántos sacos lleva cada camello?", choices: ["8", "28", "9"], hint: "¿Qué número por 4 da 32?", explain: "4 × 8 = 32, así que 32 ÷ 4 = 8 sacos para cada camello." },
      { q: "Se reparten 45 dátiles en partes iguales entre 5 viajeros. ¿Cuántos dátiles le tocan a cada uno?", choices: ["40", "8", "9"], hint: "¿Qué número por 5 da 45?", explain: "5 × 9 = 45, así que 45 ÷ 5 = 9 dátiles para cada uno." },
      { q: "42 odres de agua (bolsas de piel) se colocan en filas de 6. ¿Cuántas filas hay?", choices: ["7", "36", "8"], hint: "¿Qué número por 6 da 42?", explain: "6 × 7 = 42, así que 42 ÷ 6 = 7 filas." },
      { q: "Un comerciante mete 54 lámparas en 6 cajas iguales. ¿Cuántas lámparas van en cada caja?", choices: ["8", "48", "60", "9"], hint: "¿Qué número por 6 da 54?", explain: "6 × 9 = 54, así que 54 ÷ 6 = 9 lámparas en cada caja." },
      { q: "¿Qué operación te ayuda a hallar 36 ÷ 4?", choices: ["4 + 9 = 13", "4 × 9 = 36", "36 − 4 = 32"], hint: "La división deshace la multiplicación.", explain: "4 × 9 = 36, así que 36 ÷ 4 = 9." }
    ]
  },

  // ── Oasis 5: Campo de Globos ──
  'm5-desert-flood-fields': {
    title: "Campos después de la crecida", topicName: "Área y perímetro", blurb: "Vuelve a medir los campos después de que la crecida del Nilo borre sus bordes.",
    reading: [
      { title: "Bordes perdidos", text: "Cada año, el Nilo inundaba los campos y borraba las marcas que había entre ellos. Después, unos medidores con cuerdas de nudos volvían a medir cada campo." },
      { title: "Perímetro", text: "El perímetro es la distancia alrededor de toda una figura. Para poner una cuerda alrededor de un campo rectangular, suma los cuatro lados." },
      { title: "Área", text: "El área es cuánto suelo cubre una figura, en cuadrados como los metros cuadrados (m²). Para un rectángulo, área = largo × ancho. Un campo de 9 m de largo y 4 m de ancho cubre 36 m², y su perímetro es 9 + 4 + 9 + 4 = 26 m." }
    ],
    quiz: [
      { q: "Un campo es un rectángulo de 8 m de largo y 5 m de ancho. ¿Cuál es su área?", choices: ["13 m²", "26 m²", "40 m²"], hint: "Área = largo × ancho.", explain: "8 × 5 = 40, así que el área es 40 m²." },
      { q: "Una cuerda rodea entero un campo de 12 m de largo y 2 m de ancho. ¿Cuánto mide la cuerda?", choices: ["28 m", "24 m", "14 m"], hint: "Suma los cuatro lados.", explain: "12 + 2 + 12 + 2 = 28, así que la cuerda mide 28 m." },
      { q: "Un huerto cuadrado tiene lados de 7 m. ¿Cuál es su área?", choices: ["14 m²", "49 m²", "28 m²"], hint: "En un cuadrado, el largo y el ancho son iguales.", explain: "7 × 7 = 49, así que el área es 49 m²." },
      { q: "Un mapa de los campos es una cuadrícula de 9 cuadrados de ancho y 6 de alto. ¿Cuántos cuadrados hay?", choices: ["15", "30", "45", "54"], hint: "Filas × columnas.", explain: "9 × 6 = 54 cuadrados." },
      { q: "Dos campos tienen un área de 24 m² cada uno. Uno mide 6 m por 4 m. El otro mide 8 m de ancho. ¿Cuánto mide de largo?", choices: ["3 m", "16 m", "4 m"], hint: "¿Qué número por 8 da 24?", explain: "8 × 3 = 24, así que el segundo campo mide 3 m de largo." }
    ]
  },
  'm5-desert-market-scales': {
    title: "Equilibrar la balanza del mercado", topicName: "Ecuaciones", blurb: "Encuentra el peso misterioso que equilibra la balanza del comerciante.",
    reading: [
      { title: "Una balanza", text: "Los comerciantes egipcios pesaban sus mercancías en balanzas de dos platos, con pesas de piedra en un lado. Cuando los dos lados pesan lo mismo, la balanza queda en equilibrio." },
      { title: "El peso misterioso", text: "Un saco de x kg más una pesa de 6 kg equilibran 15 kg. Lo escribimos así: x + 6 = 15. ¿Cuánto vale x?" },
      { title: "Mantén el equilibrio", text: "Quita 6 de los dos lados y sigue en equilibrio: x = 15 − 6 = 9. Lo que hagas en un lado, hazlo también en el otro." }
    ],
    quiz: [
      { q: "Un saco y una pesa de 6 kg equilibran 15 kg: x + 6 = 15. ¿Cuánto vale x?", choices: ["9", "21", "11"], hint: "Quita 6 de los dos lados.", explain: "x = 15 − 6 = 9. Comprueba: 9 + 6 = 15." },
      { q: "12 + x = 20. ¿Cuánto vale x?", choices: ["32", "9", "8"], hint: "¿Qué le sumas a 12 para llegar a 20?", explain: "x = 20 − 12 = 8. Comprueba: 12 + 8 = 20." },
      { q: "Un comerciante saca 4 kg de dátiles de una cesta y quedan 10 kg: x − 4 = 10. ¿Cuánto había en la cesta?", choices: ["6 kg", "14 kg", "40 kg"], hint: "Suma 4 a los dos lados.", explain: "x = 10 + 4 = 14 kg. Comprueba: 14 − 4 = 10." },
      { q: "3 tarros de miel, de x kg cada uno, equilibran 21 kg: 3x = 21. ¿Cuánto vale x?", choices: ["18", "24", "63", "7"], hint: "Divide los dos lados entre 3.", explain: "x = 21 ÷ 3 = 7 kg. Comprueba: 3 × 7 = 21." },
      { q: "Para resolver x + 25 = 40, ¿qué debes hacer en los dos lados?", choices: ["Restar 25", "Sumar 25", "Multiplicar por 25"], hint: "Deshaz el + 25.", explain: "Si restas 25 en los dos lados, te queda x = 15, y la balanza sigue en equilibrio." }
    ]
  },

  // ── Oasis 6: Biblioteca de Papiros ──
  'm6-desert-cold-nights': {
    title: "Bajo cero en el desierto", topicName: "Números negativos", blurb: "Las noches del desierto pueden bajar de cero, y algunas tierras del desierto están por debajo del nivel del mar.",
    reading: [
      { title: "Noches frías en el desierto", text: "Los desiertos pueden ser muy calurosos de día y muy fríos de noche. En una noche de invierno en el Sahara, la temperatura puede bajar de 0 °C. Las temperaturas bajo cero son números negativos, como −3 °C." },
      { title: "Contar pasando por el cero", text: "Al amanecer hace −4 °C. A mediodía hace 10 grados más. Cuenta hacia arriba: −3, −2, −1, 0, 1… 6. Hace 6 °C." },
      { title: "Bajo el nivel del mar", text: "Las alturas se miden desde el nivel del mar, 0 m. Algunas partes de la depresión de Qattara, en el desierto de Egipto, están unos 133 m por debajo del nivel del mar: −133 m." }
    ],
    quiz: [
      { q: "Al amanecer hace −4 °C en el desierto. A mediodía hace 10 grados más. ¿Qué temperatura hace a mediodía?", choices: ["6 °C", "14 °C", "−14 °C"], hint: "Cuenta 10 hacia arriba desde −4.", explain: "−4 + 10 = 6. A mediodía hace 6 °C." },
      { q: "Al anochecer hace 18 °C. Hasta medianoche, la temperatura baja 21 grados. ¿Cuánto hace a medianoche?", choices: ["3 °C", "−3 °C", "−39 °C"], hint: "Baja 18 grados para llegar a 0, y luego 3 más.", explain: "18 − 21 = −3. A medianoche hace −3 °C." },
      { q: "¿Qué es más frío: −6 °C o −2 °C?", choices: ["−2 °C", "Son iguales", "−6 °C"], hint: "Cuanto más por debajo de 0, más frío.", explain: "−6 está más por debajo de 0 que −2, así que −6 °C es más frío." },
      { q: "Una noche hace −5 °C y la tarde siguiente, 20 °C. ¿Cuántos grados más hace por la tarde?", choices: ["15", "−25", "20", "25"], hint: "De −5 sube hasta 0, y luego de 0 hasta 20.", explain: "5 grados hasta llegar a 0, y luego 20 más: 5 + 20 = 25 grados más." },
      { q: "El fondo de una hondonada del desierto está a −133 m. Una colina cercana está 67 m sobre el nivel del mar. ¿Cuánto hay desde el fondo hasta la cima de la colina?", choices: ["66 m", "200 m", "−66 m"], hint: "133 m hasta el nivel del mar, y luego 67 m más.", explain: "133 + 67 = 200. Hay 200 m desde el fondo de la hondonada hasta la cima de la colina." }
    ]
  },
  'm6-desert-percent': {
    title: "Porcentajes del desierto", topicName: "Porcentajes", blurb: "Camellos, dátiles y arena: calcula porcentajes por todo el desierto.",
    reading: [
      { title: "De cada cien", text: "Por ciento quiere decir «de cada 100». Si 45 de las 100 palmeras del oasis son palmeras datileras, entonces el 45% de los árboles son palmeras datileras." },
      { title: "Los que conviene saber", text: "El 50% es la mitad, el 25% es un cuarto, el 75% son tres cuartos y el 10% es una décima parte. El Sahara cubre más o menos el 30% de África: ¡casi un tercio!" },
      { title: "Calcular un porcentaje", text: "Para hallar el 30% de 70 camellos: el 10% de 70 es 7, así que el 30% es 3 × 7 = 21 camellos." }
    ],
    quiz: [
      { q: "Una caravana tiene 60 camellos. El 50% lleva sal. ¿Cuántos camellos llevan sal?", choices: ["30", "50", "10"], hint: "El 50% es la mitad.", explain: "La mitad de 60 es 30, así que 30 camellos llevan sal." },
      { q: "Una comerciante tiene 80 dátiles. Vende el 25%. ¿Cuántos dátiles vende?", choices: ["25", "20", "40"], hint: "El 25% es un cuarto.", explain: "Un cuarto de 80 es 20, así que vende 20 dátiles." },
      { q: "De 100 palmeras, 45 son datileras. ¿Qué porcentaje son datileras?", choices: ["4,5%", "55%", "45%"], hint: "Por ciento quiere decir «de cada 100».", explain: "45 de cada 100 es el 45%." },
      { q: "Un pozo tiene 250 litros. El 10% se usa para dar de beber a los camellos. ¿Cuántos litros son?", choices: ["10", "2,5", "50", "25"], hint: "El 10% es una décima parte.", explain: "Una décima parte de 250 es 25, así que se usan 25 litros." },
      { q: "Una biblioteca tiene 120 rollos. El 75% trata de las estrellas. ¿Cuántos rollos son?", choices: ["90", "75", "30"], hint: "Primero halla un cuarto y luego toma tres.", explain: "Un cuarto de 120 es 30, así que tres cuartos son 3 × 30 = 90 rollos." }
    ]
  },

  // ── Oasis 7: Campamento Estrellado ──
  'm7-desert-caravan-equations': {
    title: "Ecuaciones para las provisiones de la caravana", topicName: "Ecuaciones de dos pasos", blurb: "Planea las provisiones de la caravana deshaciendo dos pasos.",
    reading: [
      { title: "Envolver y desenvolver", text: "En 5x + 8 = 48, a x se la multiplicó por 5 y luego se le sumó 8. Para resolverla, desenvuélvela al revés: primero deshaz el + 8 y luego el × 5." },
      { title: "Operaciones inversas", text: "La resta deshace la suma; la división deshace la multiplicación. Lo que hagas en un lado, hazlo también en el otro: 5x = 40, así que x = 8." },
      { title: "Comprueba siempre", text: "Vuelve a poner tu respuesta en la ecuación: 5 × 8 + 8 = 48. Los dos lados coinciden, así que x = 8 es correcto." }
    ],
    quiz: [
      { q: "La caravana carga x bolsas de 5 kg de harina, más 8 kg de otros alimentos. En total carga 48 kg: 5x + 8 = 48. ¿Cuánto vale x?", choices: ["9", "8", "11"], hint: "Primero deshaz el + 8 y luego el × 5.", explain: "5x = 48 − 8 = 40, así que x = 40 ÷ 5 = 8. Comprueba: 5 × 8 + 8 = 48." },
      { q: "En el cuaderno del guía pone 3x − 6 = 21. ¿Cuánto vale x?", choices: ["9", "5", "7"], hint: "Suma 6 a los dos lados y luego divide entre 3.", explain: "3x = 21 + 6 = 27, así que x = 27 ÷ 3 = 9. Comprueba: 3 × 9 − 6 = 21." },
      { q: "Una silla de montar pesa 15 kg. Un camello lleva la silla y x sacos de 20 kg: 135 kg en total. ¿Cuántos sacos son?", choices: ["7,5", "5", "6", "8"], hint: "Escribe 20x + 15 = 135 y resuélvela.", explain: "20x = 135 − 15 = 120, así que x = 120 ÷ 20 = 6 sacos. Comprueba: 20 × 6 + 15 = 135." },
      { q: "El campamento tiene 4x + 12 = 60 mantas. ¿Cuánto vale x?", choices: ["18", "15", "12"], hint: "Resta 12 y luego divide entre 4.", explain: "4x = 60 − 12 = 48, así que x = 48 ÷ 4 = 12. Comprueba: 4 × 12 + 12 = 60." },
      { q: "Para desenvolver 9x − 4 = 50 en orden inverso, ¿cuál es el primer paso?", choices: ["Dividir los dos lados entre 9", "Restar 4 a los dos lados", "Sumar 4 a los dos lados", "Multiplicar los dos lados por 9"], hint: "El − 4 fue lo último que se le hizo a x.", explain: "Deshaz primero el último paso: suma 4 y tendrás 9x = 54; luego divide entre 9 y tendrás x = 6." }
    ]
  },
  'm7-desert-pyramid-squares': {
    title: "La base cuadrada de la pirámide", topicName: "Cuadrados y raíces", blurb: "La Gran Pirámide se levanta sobre un cuadrado. Halla áreas a partir de los lados, y lados a partir de las áreas.",
    reading: [
      { title: "Una base cuadrada", text: "La Gran Pirámide se levanta sobre un cuadrado casi perfecto, de unos 230 m de lado. Sus constructores la orientaron con mucho cuidado hacia el norte, el sur, el este y el oeste." },
      { title: "Números al cuadrado", text: "6² («6 al cuadrado») quiere decir 6 × 6 = 36. El área de un cuadrado es su lado al cuadrado, así que la base de la pirámide cubre unos 230² = 52 900 m²." },
      { title: "Raíces cuadradas", text: "La raíz cuadrada va al revés: √144 pregunta qué número multiplicado por sí mismo da 144. La respuesta es 12. Si sabes el área de un cuadrado, su lado es la raíz cuadrada." }
    ],
    quiz: [
      { q: "Un patio cuadrado tiene lados de 9 m. ¿Cuál es su área?", choices: ["18 m²", "81 m²", "36 m²"], hint: "Área = lado².", explain: "9² = 9 × 9 = 81 m²." },
      { q: "Una plaza cuadrada cubre 144 m². ¿Cuánto mide cada lado?", choices: ["12 m", "72 m", "14 m"], hint: "¿Qué número multiplicado por sí mismo da 144?", explain: "12 × 12 = 144, así que √144 = 12 y cada lado mide 12 m." },
      { q: "¿Cuánto es 15²?", choices: ["30", "152", "225"], hint: "15² quiere decir 15 × 15, no 15 × 2.", explain: "15 × 15 = 225." },
      { q: "Un jardín cuadrado cubre 64 m². ¿Cuál es su perímetro?", choices: ["8 m", "16 m", "64 m", "32 m"], hint: "Primero halla el lado y luego suma los cuatro lados.", explain: "√64 = 8, así que cada lado mide 8 m. El perímetro es 4 × 8 = 32 m." },
      { q: "La base de la Gran Pirámide mide unos 230 m de lado. ¿Más o menos qué área tiene?", choices: ["Unos 52 900 m²", "Unos 920 m²", "Unos 460 m²"], hint: "Área = 230 × 230.", explain: "230 × 230 = 52 900, así que la base cubre unos 52 900 m²: más que siete campos de fútbol." }
    ]
  },

  // ───────── Escuela del Templo (historia) ─────────
  // ── Oasis 1: Puerta de la Esfinge ──
  'h1-desert-nile-farmers': {
    title: "Los agricultores del Nilo",
    topicName: "La agricultura junto al Nilo",
    blurb: "Siembra, cultiva y cosecha con un agricultor, al ritmo del gran río.",
    reading: [
      { title: "Un río en el desierto", text: "Egipto es casi todo desierto, seco y caluroso. Pero el largo río Nilo lo cruza de punta a punta, y la gente cultivaba sus alimentos en la tierra verde que hay junto al río." },
      { title: "La crecida", text: "Cada verano, el Nilo crecía y se extendía sobre los campos. Cuando el agua volvía a bajar, dejaba un barro oscuro y fértil, muy bueno para que crecieran las plantas." },
      { title: "Tres estaciones", text: "Los antiguos egipcios tenían tres estaciones: la crecida, el tiempo de crecer y la cosecha. Cultivaban trigo y cebada, y también cebollas, habas, lechugas y melones." },
      { title: "Pan para todos", text: "Con el trigo y la cebada se hacía pan. ¡El pan era tan importante que a muchos trabajadores les pagaban con él!" }
    ],
    dialogue: {
      npc: { name: "Nefer", role: "un agricultor junto al Nilo, hace mucho tiempo" },
      intro: "¡Hola, qué alegría verte! Soy Nefer. El río ya ha bajado, así que es hora de sembrar. ¿Me ayudas a esparcir las semillas?",
      topics: [
        { ask: "¿Por qué vives junto al río?", answer: "¡Porque el río nos da agua! Lejos del Nilo solo hay arena y roca. Aquí, junto al río, la tierra es verde y buena para cultivar." },
        { ask: "¿Qué pasa en la crecida?", answer: "Cada verano, el río crece y cubre nuestros campos. Cuando el agua baja, deja barro negro. ¡Por ese barro llamamos a nuestra tierra Kemet, la Tierra Negra!" },
        { ask: "¿Qué cultivas?", answer: "Trigo y cebada para el pan, y cebollas, habas, lechugas y melones. También cultivamos lino, una planta con la que hacemos una tela suave." },
        { ask: "¿Cómo riegas las plantas?", answer: "Cavamos canalitos desde el río hasta los campos. Y usamos un shaduf: un palo largo con un cubo en una punta y un peso pesado en la otra. Con él, subir el agua es fácil." },
        { ask: "¿Cómo sabes cuándo viene la crecida?", answer: "¡Miramos el cielo! Cuando una estrella brillante llamada Sirio sale justo antes que el Sol en verano, sabemos que el río pronto va a crecer." }
      ],
      challenge: {
        q: "¿Qué dejaba en los campos la crecida del Nilo?",
        choices: ["Barro oscuro y fértil", "Nieve", "Rocas grandes"],
        explain: "Cuando el agua de la crecida bajaba, dejaba barro oscuro y fértil, y en él los cultivos crecían muy bien."
      },
      farewell: "¡Gracias por tu ayuda! Vuelve en la época de la cosecha y haremos pan juntos."
    },
    timeline: {
      title: "La agricultura junto al Nilo",
      events: [
        { label: "La gente empieza a cultivar trigo y cebada junto al Nilo", when: "hace unos 7000 años" },
        { label: "Los agricultores cavan canales para llevar el agua del río a sus campos", when: "hace unos 5000 años" },
        { label: "Los agricultores usan el shaduf para subir el agua", when: "hace unos 3500 años" },
        { label: "Se termina la presa alta de Asuán, y el Nilo deja de crecer cada año", when: "1970" }
      ]
    },
    artifact: {
      name: "Un shaduf",
      text: "Un shaduf es un palo largo apoyado sobre un poste, como un balancín. En una punta cuelga un cubo y en la otra hay un peso pesado. El agricultor baja el cubo hasta el agua, y el peso le ayuda a subirlo otra vez. Algunos agricultores todavía lo usan hoy."
    },
    quiz: [
      { q: "¿Qué cruza el desierto de Egipto y da agua a los campos?", choices: ["Un gran glaciar", "El río Nilo", "El mar"], hint: "Es un río muy largo.", explain: "El río Nilo cruza el desierto, y los cultivos crecen en la tierra verde que hay a su lado." },
      { q: "¿Qué dejaba la crecida del Nilo en los campos?", choices: ["Arena", "Sal", "Barro oscuro y fértil"], hint: "Los egipcios llamaban a su tierra la Tierra Negra.", explain: "La crecida dejaba barro oscuro y fértil, muy bueno para los cultivos." },
      { q: "¿Qué hacían los agricultores con el trigo y la cebada?", choices: ["Pan", "Papel", "Cuerdas"], hint: "A los trabajadores les pagaban con él.", explain: "Con el trigo y la cebada se hacía pan, el alimento más importante del antiguo Egipto." },
      { q: "¿Cuántas estaciones tenían los antiguos egipcios?", choices: ["Cuatro", "Dos", "Tres"], hint: "La crecida, el tiempo de crecer y…", explain: "Tenían tres estaciones: la crecida, el tiempo de crecer y la cosecha." },
      { q: "¿Para qué les servía el shaduf a los agricultores?", choices: ["Para subir agua del río", "Para pescar", "Para contar ovejas"], hint: "Tiene un cubo en una punta.", explain: "Un shaduf es un palo con un cubo y un peso, y ayuda a subir agua del río." }
    ]
  },
  'h1-desert-toys-games': {
    title: "Juguetes y juegos del antiguo Egipto",
    topicName: "Juguetes y juegos de hace mucho tiempo",
    blurb: "Haz girar un trompo, lanza una pelota y juega al senet con una fabricante de juguetes de hace mucho tiempo.",
    reading: [
      { title: "Los niños también jugaban", text: "A los niños del antiguo Egipto les encantaba jugar, igual que a ti. Tenían pelotas, trompos, muñecas y animalitos de madera." },
      { title: "Juguetes que se mueven", text: "¡Algunos juguetes se movían! Un gato de madera que hoy está en un museo tiene una mandíbula que se mueve, así que puede abrir y cerrar la boca." },
      { title: "El senet", text: "El senet era un juego de mesa con 30 casillas en tres filas. Los jugadores lanzaban unos palitos planos para saber cuánto avanzar, un poco como los dados. Jugaban tanto los campesinos como los faraones." },
      { title: "Juegos al aire libre", text: "Las pinturas de paredes antiguas muestran a gente jugando a tirar de la cuerda, a saltar unos por encima de otros y a atrapar la pelota, ¡y hasta haciendo malabares!" }
    ],
    dialogue: {
      npc: { name: "Meryt", role: "una fabricante de juguetes del antiguo Egipto" },
      intro: "¡Hola! Soy Meryt y hago juguetes. Mira, este gatito de madera puede abrir la boca. ¿Quieres jugar?",
      topics: [
        { ask: "¿Qué juguetes haces?", answer: "Pelotas, trompos, muñecas y animalitos de madera. Mi favorito es este gato que mueve la mandíbula. ¡Los niños se ríen cuando abre la boca!" },
        { ask: "¿De qué están hechas tus pelotas?", answer: "De cuero o de tela de lino, rellenas de paja o de juncos. Algunas son de arcilla. ¡Son buenas para lanzar y atrapar!" },
        { ask: "¿Cómo se juega al senet?", answer: "El senet tiene 30 casillas en tres filas. Lanzas cuatro palitos planos y cuentas cuántos caen con el lado claro hacia arriba. Luego mueves tus fichas por el tablero. ¡Gana quien saque antes todas sus fichas del tablero!" },
        { ask: "¿Los mayores también juegan?", answer: "¡Claro que sí! A todo el mundo le encanta el senet, desde los campesinos hasta el faraón. Algunas personas tienen tableros de senet preciosos, de madera y marfil." },
        { ask: "¿A qué juegas al aire libre?", answer: "¡A tirar de la cuerda, a saltar unos por encima de otros, a hacer carreras y a atrapar la pelota! Algunas niñas saben hacer malabares con tres pelotas a la vez. ¿Y tú?" }
      ],
      challenge: {
        q: "¿Qué era el senet?",
        choices: ["Un juego de mesa", "Un tipo de pan", "Un barco"],
        explain: "El senet era un juego de mesa con 30 casillas. La gente lanzaba palitos para saber cuánto avanzaban sus fichas."
      },
      farewell: "¡Gracias por jugar! Llévate este trompo. ¡Dale un buen giro!"
    },
    timeline: {
      title: "Los juegos a lo largo del tiempo",
      events: [
        { label: "La gente de Egipto juega al senet", when: "hace unos 5000 años" },
        { label: "Los niños de la ciudad de El Lahun juegan con pelotas y trompos", when: "hace unos 3850 años" },
        { label: "Al rey Tutankamón lo entierran con sus tableros de senet", when: "hacia 1323 a. C." },
        { label: "Los arqueólogos desentierran los juguetes de El Lahun", when: "1889" }
      ]
    },
    artifact: {
      name: "Un tablero de senet",
      text: "Este es un tablero de senet, con 30 casillas en tres filas y unas fichas pequeñas. El senet es uno de los juegos de mesa más antiguos que conocemos. Hoy nadie sabe con seguridad todas sus reglas, ¡así que la gente sigue intentando descubrirlas!"
    },
    quiz: [
      { q: "¿Jugaban con juguetes los niños del antiguo Egipto?", choices: ["No, nunca jugaban", "Sí, con pelotas, trompos y animales de madera"], hint: "Piensa en el taller de Meryt.", explain: "¡Sí! Los niños jugaban con pelotas, trompos, muñecas y animales de madera." },
      { q: "¿Cuántas casillas tiene un tablero de senet?", choices: ["30", "10", "100"], hint: "Tres filas de diez.", explain: "Un tablero de senet tiene 30 casillas en tres filas de 10." },
      { q: "En el senet, ¿qué lanzaban los jugadores para saber cuánto avanzar?", choices: ["Zapatos", "Palitos planos", "Piedras a un estanque"], hint: "Eran un poco como los dados.", explain: "Los jugadores lanzaban palitos planos y contaban cómo caían." },
      { q: "¿Quién jugaba al senet?", choices: ["Solo los faraones", "Solo los niños", "Gente de todo tipo, desde campesinos hasta faraones"], hint: "A todo el mundo le encantaba.", explain: "Gente de todo tipo jugaba al senet, desde los campesinos hasta el propio faraón." },
      { q: "¿A qué jugaba al aire libre la gente del antiguo Egipto?", choices: ["Al hockey sobre hielo", "A los videojuegos", "A tirar de la cuerda"], hint: "Se tira de una cuerda.", explain: "Las pinturas antiguas de las paredes muestran a gente jugando a tirar de la cuerda, a saltar unos por encima de otros y a atrapar la pelota." }
    ]
  },

  // ── Oasis 2: Mercado de Camellos ──
  'h2-desert-hieroglyphs': {
    title: "Jeroglíficos y papiro",
    topicName: "Jeroglíficos y papiro",
    blurb: "Aprende la escritura con dibujos junto a un escriba, y haz papel con una planta del río.",
    reading: [
      { title: "Escribir con dibujos", text: "Los jeroglíficos son la escritura de los antiguos egipcios. Hay cientos de signos: pájaros, ojos, pies, agua, serpientes y mucho más. Algunos representan sonidos, y otros, palabras enteras." },
      { title: "¿Hacia dónde se lee?", text: "¡Los jeroglíficos se podían escribir de izquierda a derecha, de derecha a izquierda o de arriba abajo! Se lee hacia donde miran las caras de las personas y los animales." },
      { title: "Papel de una planta", text: "El papiro es un junco alto que crecía junto al Nilo. La gente cortaba su tallo en tiras finas, las colocaba en dos capas, las aplastaba y las dejaba secar. Así se hacía una hoja para escribir." },
      { title: "Los escribas", text: "Los escribas eran personas que aprendían a leer y escribir. Iban a la escuela durante años y escribían listas, cartas y cuentos con pinceles de junco y tinta." }
    ],
    dialogue: {
      npc: { name: "Kha", role: "un escriba del antiguo Egipto" },
      intro: "¡Te doy la bienvenida! Soy Kha, un escriba. Siéntate con las piernas cruzadas, como yo, y te enseñaré a escribir en jeroglíficos.",
      topics: [
        { ask: "¿Qué son los jeroglíficos?", answer: "Son nuestros signos de escritura, ¡y hay cientos! Este búho representa el sonido «m», y esta línea ondulada de agua representa el sonido «n»." },
        { ask: "¿Cómo se hace la tinta?", answer: "La tinta negra se hace con hollín, el polvo negro que deja el fuego. La tinta roja se hace con ocre rojo, una tierra de color. Las mezclo con agua y un poco de goma, y mojo en ellas un pincel fino de junco." },
        { ask: "¿Cómo se hace el papiro?", answer: "Cortamos los tallos del junco de papiro en tiras finas. Ponemos una capa a lo ancho y otra a lo largo, las aplastamos y las dejamos secar al sol. ¡El propio jugo de la planta ayuda a pegarlas!" },
        { ask: "¿Cuánto tiempo fuiste a la escuela?", answer: "¡Muchos años! Empecé cuando era pequeño. Copiaba los mismos signos una y otra vez, hasta que mi mano se los sabía de memoria." },
        { ask: "¿Qué escriben los escribas?", answer: "¡De todo! Cuánto grano hay en los almacenes, cartas, cuentos y listas de trabajadores. Sin los escribas, nadie podría llevar la cuenta de nada." }
      ],
      challenge: {
        q: "¿Con qué hacían el papiro los egipcios?",
        choices: ["Con lana de oveja", "Con un junco que crecía junto al Nilo", "Con corteza de árbol"],
        explain: "El papiro se hacía con tiras de un junco alto que crecía junto al Nilo, aplastadas juntas y secadas."
      },
      farewell: "¡Muy bien, joven escriba! Sigue practicando y tus signos serán tan bonitos como los míos."
    },
    timeline: {
      title: "La escritura en el antiguo Egipto",
      events: [
        { label: "Se escriben los primeros jeroglíficos", when: "hacia 3200 a. C." },
        { label: "Se hace el rollo de papiro más antiguo que conocemos (¡lo dejaron en blanco!)", when: "hacia 3000 a. C." },
        { label: "Se tallan los últimos jeroglíficos conocidos, en un templo de la isla de Filé", when: "394 d. C." },
        { label: "Se encuentra la piedra de Rosetta", when: "1799" },
        { label: "Champollion descubre cómo leer los jeroglíficos", when: "1822" }
      ]
    },
    artifact: {
      name: "Un rollo de papiro",
      text: "Las hojas de papiro se pegaban una detrás de otra para hacer rollos largos, algunos de muchos metros. El papiro dura muchísimo en el aire seco del desierto, así que todavía podemos leer algunos rollos después de miles de años."
    },
    quiz: [
      { q: "¿Qué son los jeroglíficos?", choices: ["Signos de escritura del antiguo Egipto", "Monedas egipcias", "Piedras de las pirámides"], hint: "Kha escribe con ellos.", explain: "Los jeroglíficos son los signos que usaban los antiguos egipcios para escribir." },
      { q: "¿Con qué se hacía el papiro?", choices: ["Con barro y paja", "Con tiras de un junco", "Con oro"], hint: "Crecía junto al Nilo.", explain: "El papiro se hacía con tiras finas del junco de papiro, aplastadas juntas y secadas." },
      { q: "¿Hacia dónde se leen los jeroglíficos?", choices: ["Siempre de abajo arriba", "Hacia las caras de las personas y los animales", "Solo desde el centro"], hint: "Fíjate hacia dónde miran los pájaros.", explain: "Se lee hacia donde miran las caras de las personas y los animales de los signos." },
      { q: "¿Con qué escribían los escribas?", choices: ["Con lápiz y goma", "Con ceras de colores", "Con pinceles de junco y tinta"], hint: "La tinta se hacía con hollín.", explain: "Los escribas escribían con pinceles finos de junco mojados en tinta negra o roja." },
      { q: "¿Por qué todavía podemos leer algunos rollos de papiro de hace tanto tiempo?", choices: ["El aire seco del desierto los protegió", "Eran de plástico", "Los guardaban en congeladores"], hint: "Piensa en el clima de Egipto.", explain: "El aire seco del desierto evitó que el papiro se pudriera, así que algunos rollos han durado miles de años." }
    ]
  },
  'h2-desert-camel-caravans': {
    title: "Caravanas de camellos del Sahara",
    topicName: "Caravanas de camellos",
    blurb: "Cruza el Sahara con un guía de caravanas, orientándote por el Sol y las estrellas.",
    reading: [
      { title: "El Sahara", text: "El Sahara es el desierto cálido más grande del mundo. Se extiende por todo el norte de África y es casi tan grande como todo Estados Unidos." },
      { title: "Barcos del desierto", text: "Los camellos pueden caminar días sin beber, y sus patas anchas y blandas no se hunden en la arena. Por eso los llaman los barcos del desierto." },
      { title: "Largas filas de camellos", text: "Una caravana es un grupo de comerciantes que viajan juntos. Durante cientos de años, las caravanas llevaron sal, oro, telas y libros a través del Sahara." },
      { title: "Encontrar el camino", text: "Los guías de caravanas conocían muy bien el desierto. Se orientaban por la forma de las dunas y las rocas, por el Sol y, de noche, por las estrellas." }
    ],
    dialogue: {
      npc: { name: "Amastan", role: "un guía de caravanas del Sahara" },
      intro: "¡Bienvenido a nuestro campamento, viajero! Soy Amastan. Mañana nuestra caravana sale a cruzar la arena. ¡Ven a conocer a mis camellos!",
      topics: [
        { ask: "¿Por qué camellos y no caballos?", answer: "Los camellos pueden pasar muchos días sin agua, y pueden comer plantas espinosas del desierto. Sus patas anchas y blandas caminan por la arena sin hundirse. ¡Aquí un caballo pronto estaría cansado y con sed!" },
        { ask: "¿Qué hay en la joroba de un camello?", answer: "¡Grasa, no agua! El cuerpo del camello puede usar esa grasa cuando hay poca comida. Si un camello pasa hambre mucho tiempo, su joroba se hace más pequeña y se queda caída." },
        { ask: "¿Qué llevan las caravanas?", answer: "Durante cientos de años, las caravanas llevaron sal del desierto hacia el sur, y volvieron con oro, telas y hasta libros. La sal era muy valiosa." },
        { ask: "¿Cómo encuentras el camino?", answer: "De día, leo las dunas y las rocas, y miro el Sol. De noche, las estrellas me muestran el camino. Mi abuela me enseñó sus nombres cuando yo era pequeño." },
        { ask: "¿Dónde duermes?", answer: "¡En tiendas o bajo las estrellas! Las noches del desierto son frías, así que nos tapamos con mantas gruesas y nos sentamos junto al fuego con un vaso de té dulce de menta." }
      ],
      challenge: {
        q: "¿Por qué a los camellos los llaman los barcos del desierto?",
        choices: ["Saben nadar", "Tienen velas", "Llevan personas y mercancías por la arena, como los barcos cruzan el mar"],
        explain: "Los camellos llevan personas y cargas pesadas por el mar de arena, igual que los barcos las llevan por el mar."
      },
      farewell: "¡Buen viaje, amigo! Que siempre encuentres agua y buena compañía."
    },
    timeline: {
      title: "Camellos y caravanas",
      events: [
        { label: "La gente de Arabia empieza a criar camellos", when: "hace unos 3000 años" },
        { label: "Los camellos se vuelven comunes en el Sahara", when: "hacia el 300 d. C." },
        { label: "Grandes caravanas cruzan el Sahara con sal y oro", when: "hacia el año 1000" },
        { label: "Mansa Musa de Malí cruza el Sahara camino de La Meca", when: "1324" }
      ]
    },
    artifact: {
      name: "Una placa de sal",
      text: "La sal se sacaba del desierto en grandes placas y se ataba a los camellos, varias placas en cada uno. La sal era valiosa porque la necesitamos para estar sanos, y además evita que la comida se eche a perder."
    },
    quiz: [
      { q: "¿Qué es el Sahara?", choices: ["Un gran bosque", "El desierto cálido más grande del mundo", "Una montaña fría"], hint: "Se extiende por el norte de África.", explain: "El Sahara es el desierto cálido más grande del mundo." },
      { q: "¿Qué guarda la joroba de un camello?", choices: ["Grasa", "Agua", "Arena"], hint: "¡No es agua!", explain: "La joroba del camello guarda grasa, que su cuerpo puede usar cuando escasea la comida." },
      { q: "¿Qué es una caravana?", choices: ["Un tipo de tienda", "Una planta del desierto", "Un grupo de comerciantes que viajan juntos"], hint: "Largas filas de camellos.", explain: "Una caravana es un grupo de comerciantes que viajan juntos, a menudo con muchos camellos." },
      { q: "¿Cómo encontraban el camino de noche los guías de caravanas?", choices: ["Por las estrellas", "Con farolas", "Siguiendo trenes"], hint: "¡Mira hacia arriba!", explain: "De noche, los guías se orientaban por las estrellas." },
      { q: "¿Por qué la sal era tan valiosa?", choices: ["Porque brillaba", "Porque la necesitamos para estar sanos y evita que la comida se eche a perder", "Porque era dulce"], hint: "Piensa en la salud y en la comida.", explain: "Nuestro cuerpo necesita sal, y la sal evita que la comida se estropee, así que era muy valiosa." }
    ]
  },

  // ── Oasis 3: Puerto de las Falucas ──
  'h3-desert-imhotep': {
    title: "Imhotep y la pirámide escalonada",
    topicName: "Imhotep y la pirámide escalonada",
    blurb: "Conoce al constructor de la primera gran pirámide de piedra.",
    reading: [
      { title: "Tumbas antes de las pirámides", text: "Antes de las pirámides, a los reyes de Egipto los enterraban bajo edificios bajos de adobe, con el techo plano. Hoy los llamamos mastabas, una palabra árabe que significa «banco»." },
      { title: "Una idea nueva", text: "Hace unos 4700 años, un funcionario real muy listo llamado Imhotep construyó una tumba para el rey Zoser. Apiló seis pisos, cada uno más pequeño que el de abajo. ¡Así nació la pirámide escalonada!" },
      { title: "De piedra", text: "La pirámide escalonada es el edificio enorme más antiguo hecho todo de piedra tallada. Mide unos 60 metros de alto y todavía sigue en pie en Saqqara." },
      { title: "Recordado para siempre", text: "A Imhotep se le recordó como un gran constructor y un hombre sabio. Mucho después, los egipcios hasta decían que había sido un gran sanador." }
    ],
    dialogue: {
      npc: { name: "Imhotep", role: "el constructor real de la pirámide escalonada del rey Zoser" },
      intro: "¡Saludos! Soy Imhotep y sirvo al rey Zoser. Ven a ver mi plan: ¡una escalera de piedra hasta el cielo!",
      topics: [
        { ask: "¿Cómo eran antes las tumbas?", answer: "A los reyes los enterraban bajo edificios bajos de techo plano y lados inclinados, hechos de adobe. Yo me pregunté: ¿y si ponemos uno encima de otro, cada uno un poco más pequeño?" },
        { ask: "¿Por qué usar piedra?", answer: "El adobe se desmorona, pero la piedra dura. Quiero que la tumba del rey dure para siempre, así que cada bloque está tallado en piedra caliza." },
        { ask: "¿Cuántos escalones tiene?", answer: "Seis grandes escalones, uno encima de otro, cada uno más pequeño que el de abajo. Se eleva unos 60 metros: más alto que nada que nadie haya visto jamás por aquí." },
        { ask: "¿Cómo lo mides todo?", answer: "¡Con una vara de un codo! Un codo real mide más o menos lo que el brazo de un adulto desde el codo hasta la punta de los dedos. Todos mis trabajadores usan el mismo codo, así que todas las piedras encajan." },
        { ask: "¿Qué más hay alrededor de la pirámide?", answer: "Un gran patio, templos y un largo muro que lo rodea todo. El muro tiene catorce puertas, ¡pero solo una es de verdad! Las demás están talladas en la piedra." }
      ],
      challenge: {
        q: "¿Cómo hizo Imhotep la pirámide escalonada?",
        choices: ["Apiló seis pisos, cada uno más pequeño que el de abajo", "Amontonó cajas de madera", "Cavó un agujero gigante"],
        explain: "Imhotep apiló seis pisos de piedra, cada uno más pequeño que el de abajo, y formó una escalera de escalones."
      },
      farewell: "¡Que tus planes sean tan atrevidos como los míos! Recuerda: primero mide con cuidado, y luego construye."
    },
    timeline: {
      title: "De las mastabas a las pirámides",
      events: [
        { label: "A los reyes los entierran bajo mastabas de techo plano", when: "hacia 2900 a. C." },
        { label: "Imhotep construye la pirámide escalonada para el rey Zoser", when: "hacia 2670 a. C." },
        { label: "Los constructores del rey Seneferu prueban una pirámide de lados lisos: la pirámide acodada", when: "hacia 2600 a. C." },
        { label: "Se construye la Gran Pirámide de Guiza", when: "hacia 2560 a. C." },
        { label: "La pirámide escalonada vuelve a abrirse a los visitantes tras una larga restauración", when: "2020" }
      ]
    },
    artifact: {
      name: "Una vara de un codo",
      text: "Los constructores egipcios medían con varas de un codo. Un codo real medía unos 52 cm y se dividía en 7 palmos, y cada palmo en 4 dedos. Usar la misma medida en todas partes ayudaba a que todas las piedras encajaran."
    },
    quiz: [
      { q: "¿Qué era una mastaba?", choices: ["Un barco", "Una tumba baja de techo plano", "Una torre alta"], hint: "La palabra significa «banco».", explain: "Una mastaba era una tumba baja con el techo plano y los lados inclinados." },
      { q: "¿Quién planeó la pirámide escalonada?", choices: ["Imhotep", "Tutankamón", "Cleopatra"], hint: "Trabajaba para el rey Zoser.", explain: "Imhotep planeó la pirámide escalonada para el rey Zoser." },
      { q: "¿Cuántos escalones grandes tiene la pirámide escalonada?", choices: ["Tres", "Diez", "Seis"], hint: "Cuenta los pisos de Imhotep.", explain: "La pirámide escalonada tiene seis escalones grandes." },
      { q: "¿Por qué Imhotep construyó con piedra en vez de con adobe?", choices: ["La piedra pesa menos", "La piedra dura mucho más", "No había barro"], hint: "Quería que durara para siempre.", explain: "El adobe se desmorona, pero la piedra dura miles de años." },
      { q: "¿Cuántos palmos tenía un codo real?", choices: ["10", "2", "7"], hint: "Mira la vara de un codo.", explain: "Un codo real se dividía en 7 palmos, y cada palmo en 4 dedos." }
    ]
  },
  'h3-desert-builders-town': {
    title: "El pueblo de los constructores de pirámides",
    topicName: "Los constructores de pirámides",
    blurb: "Hornea pan y conoce a los equipos que construyeron la Gran Pirámide.",
    reading: [
      { title: "¿Quién construyó las pirámides?", text: "La Gran Pirámide la construyeron hace unos 4500 años miles de trabajadores egipcios. Les pagaban, les daban de comer y los cuidaban." },
      { title: "Un pueblo para los trabajadores", text: "Cerca de las pirámides había un pueblo entero para los constructores, con casas, grandes panaderías y cocinas. Los arqueólogos han desenterrado sus hornos y las vasijas en las que se horneaba el pan." },
      { title: "Equipos con nombre", text: "A los trabajadores los organizaban en equipos, y algunos equipos pintaban su nombre en las piedras que movían. ¡Un equipo se llamaba los Amigos de Keops!" },
      { title: "Cuidarse unos a otros", text: "Los médicos atendían a los trabajadores que se hacían daño. Algunos esqueletos muestran huesos rotos que se colocaron bien y se curaron." }
    ],
    dialogue: {
      npc: { name: "Ipi", role: "un panadero del pueblo de los constructores de pirámides, hacia 2560 a. C." },
      intro: "Mmm, ¿hueles eso? ¡Pan recién hecho! Soy Ipi y horneo para los constructores de la pirámide del rey Keops. ¡Hay muchos trabajadores con hambre a los que dar de comer!",
      topics: [
        { ask: "¿Quiénes son los constructores?", answer: "Canteros, arrastradores de piedras, carpinteros y muchos más. Algunos trabajan aquí todo el año. Muchos campesinos también vienen a ayudar unos meses, sobre todo cuando la crecida cubre sus campos." },
        { ask: "¿Qué comen los trabajadores?", answer: "¡Mucho pan, claro! Y cebollas, habas, pescado y, a veces, carne de vaca. Horneamos el pan en grandes vasijas de barro, cientos a la vez." },
        { ask: "¿Les pagan a los trabajadores?", answer: "¡Sí! No usamos monedas, así que les pagan con comida, como pan, y otras cosas buenas. Un día de trabajo duro se gana una buena comida." },
        { ask: "¿Cómo mueven las piedras grandes?", answer: "Los equipos arrastran las piedras sobre trineos de madera. Alguien echa agua en la arena delante del trineo, y así se desliza mucho más fácilmente. ¡Pruébalo en el Observatorio del Sol!" },
        { ask: "¿Y si un trabajador se hace daño?", answer: "¡Nuestros médicos lo ayudan! Vendan los cortes y sujetan los huesos rotos con tablillas, y los trabajadores descansan hasta que se ponen mejor." }
      ],
      challenge: {
        q: "¿Les pagaban a los constructores de pirámides?",
        choices: ["Sí, con comida como pan", "No, nunca", "Sí, con monedas de oro"],
        explain: "A los constructores les pagaban con comida como pan. Egipto todavía no usaba monedas."
      },
      farewell: "¡Llévate un pan para el camino! Y cuéntales a todos quién construyó de verdad las pirámides: gente como nosotros."
    },
    timeline: {
      title: "La construcción de la Gran Pirámide",
      events: [
        { label: "Los trabajadores del rey Keops empiezan su pirámide en Guiza", when: "hacia 2580 a. C." },
        { label: "Se termina la Gran Pirámide, de unos 146 metros de alto", when: "hacia 2560 a. C." },
        { label: "La aguja de una catedral de Inglaterra por fin es más alta que la Gran Pirámide", when: "hacia 1311" },
        { label: "Un caballo tropieza con un muro antiguo y se descubren las tumbas de los constructores", when: "1990" },
        { label: "Los arqueólogos desentierran las panaderías de los constructores", when: "1991" }
      ]
    },
    artifact: {
      name: "Una maqueta de la Gran Pirámide",
      text: "Hace mucho tiempo, la Gran Pirámide estaba cubierta de piedra caliza blanca, lisa y brillante. Casi toda esa capa de fuera se la llevaron hace siglos, así que ahora se ven debajo los escalones de piedra rugosa."
    },
    quiz: [
      { q: "¿Quién construyó la Gran Pirámide?", choices: ["Unos gigantes", "Miles de trabajadores egipcios a los que pagaban y daban de comer", "Unos robots"], hint: "Vivían en un pueblo cercano.", explain: "La construyeron miles de trabajadores egipcios, a los que pagaban, daban de comer y cuidaban." },
      { q: "¿Qué encontraron los arqueólogos en el pueblo de los constructores?", choices: ["Panaderías con hornos y vasijas para el pan", "Una estación de tren", "Una piscina"], hint: "Ipi trabaja allí.", explain: "Encontraron panaderías con hornos y las vasijas en las que se horneaba el pan." },
      { q: "¿Cómo conseguían los trabajadores que un trineo se deslizara mejor por la arena?", choices: ["Le ponían ruedas", "Usaban hielo", "Echaban agua en la arena delante del trineo"], hint: "La arena mojada es más firme.", explain: "Al echar agua en la arena, se volvía más firme, y el trineo se deslizaba con más facilidad." },
      { q: "¿Qué pintaban algunos equipos en las piedras?", choices: ["El nombre de su equipo", "Mapas del mundo", "Listas de la compra"], hint: "¡Los Amigos de Keops!", explain: "Algunos equipos pintaban su nombre en las piedras, como los Amigos de Keops." },
      { q: "¿Cómo les pagaban a los trabajadores?", choices: ["Con monedas de oro", "Con comida como pan", "Con billetes"], hint: "Egipto todavía no tenía monedas.", explain: "A los trabajadores les pagaban con comida como pan, porque Egipto todavía no usaba monedas." }
    ]
  },

  // ── Oasis 4: Plaza del Obelisco ──
  'h4-desert-hatshepsut': {
    title: "Hatshepsut, la faraona constructora",
    topicName: "Hatshepsut",
    blurb: "Conoce a una de las pocas mujeres que fueron faraón de Egipto y navega con sus barcos hasta Punt.",
    reading: [
      { title: "Una mujer faraón", text: "Hatshepsut gobernó Egipto hace unos 3500 años, durante unos 20 años. Fue una de las pocas mujeres que llegaron a ser faraón." },
      { title: "Un tiempo de comercio", text: "Su reinado fue casi siempre pacífico. Envió expediciones comerciales y mandó construir muchos templos y monumentos por todo Egipto." },
      { title: "El viaje a Punt", text: "Envió barcos a una tierra lejana llamada Punt, en algún lugar del sur, junto al mar Rojo. ¡Volvieron con árboles de incienso, madera de ébano, oro y hasta babuinos! Los expertos todavía discuten dónde estaba Punt exactamente." },
      { title: "Obeliscos y un templo", text: "Hatshepsut levantó en Karnak altos obeliscos de piedra, con puntas de metal brillante. Su precioso templo de Deir el-Bahari tiene filas de columnas al pie de los acantilados." }
    ],
    dialogue: {
      npc: { name: "Hatshepsut", role: "faraón de Egipto" },
      intro: "¡Bienvenido a mi templo! Soy Hatshepsut, faraón de Egipto. Mira estos muros: cuentan la historia de mis barcos.",
      topics: [
        { ask: "¿Una mujer puede ser faraón?", answer: "¡Es muy raro! Soy hija de un faraón. Primero goberné en nombre del joven rey, Tutmosis, y luego me convertí yo misma en faraón. En mis estatuas llevo la corona y el tocado del faraón, igual que un rey." },
        { ask: "¿Dónde está Punt?", answer: "Muy lejos, hacia el sur, en la costa del mar Rojo. Mis barcos navegaron durante semanas para llegar allí, ¡y volvieron cargados de tesoros!" },
        { ask: "¿Qué trajeron tus barcos?", answer: "¡Árboles de incienso en cestas, para plantarlos en mi templo! Madera de ébano, oro, marfil y hasta babuinos. ¿Te imaginas babuinos en un barco?" },
        { ask: "¿Qué es un obelisco?", answer: "Un pilar de piedra alto y delgado con una pequeña pirámide en la punta, como un rayo de sol hecho de piedra. Mandé levantar dos en Karnak, cada uno tallado en una sola pieza de granito rosa." },
        { ask: "¿Por qué construyes tanto?", answer: "Los edificios duran. Mucho después de que yo me haya ido, la gente verá mi templo y recordará un tiempo de paz y comercio en Egipto." }
      ],
      challenge: {
        q: "¿Adónde envió Hatshepsut sus barcos comerciales?",
        choices: ["A la Luna", "A la tierra de Punt", "A la Antártida"],
        explain: "Sus barcos navegaron hacia el sur por el mar Rojo hasta la tierra de Punt y volvieron con árboles de incienso, ébano y oro."
      },
      farewell: "Gracias por tu visita, joven viajero. Construye algo que haga sonreír a la gente."
    },
    timeline: {
      title: "El Egipto de Hatshepsut",
      events: [
        { label: "Hatshepsut empieza a gobernar en nombre del joven rey Tutmosis III", when: "hacia 1479 a. C." },
        { label: "Sus barcos navegan hasta la tierra de Punt", when: "hacia 1470 a. C." },
        { label: "Se levantan sus dos obeliscos en Karnak", when: "hacia 1460 a. C." },
        { label: "Termina su reinado, después de unos 20 años", when: "hacia 1458 a. C." },
        { label: "Un equipo polaco y egipcio empieza a restaurar su templo", when: "1961" }
      ]
    },
    artifact: {
      name: "Un obelisco",
      text: "Un obelisco es un pilar de piedra alto, de cuatro lados, con una pequeña pirámide en la punta, y cada uno se tallaba en un solo bloque de piedra. Uno de los obeliscos de Hatshepsut sigue en pie en Karnak y mide casi 30 metros de alto."
    },
    quiz: [
      { q: "¿Quién fue Hatshepsut?", choices: ["Una de las pocas mujeres que gobernaron Egipto como faraón", "Un camello famoso", "Una capitana de barco de Punt"], hint: "Llevaba la corona del faraón.", explain: "Hatshepsut fue una de las pocas mujeres que gobernaron Egipto como faraón." },
      { q: "¿Qué trajeron sus barcos de Punt?", choices: ["Nieve y hielo", "Árboles de incienso, ébano y oro", "Caballos y carros"], hint: "Algunas cosas se plantaron en su templo.", explain: "Los barcos trajeron árboles de incienso, madera de ébano, oro, marfil y hasta babuinos." },
      { q: "¿Qué es un obelisco?", choices: ["Un juego de mesa", "Un barco", "Un pilar de piedra alto y delgado con la punta afilada"], hint: "Como un rayo de sol hecho de piedra.", explain: "Un obelisco es un pilar de piedra alto, de cuatro lados, con una pequeña pirámide en la punta." },
      { q: "¿Más o menos cuánto tiempo gobernó Hatshepsut?", choices: ["Unos 20 años", "Unos 2 años", "Unos 200 años"], hint: "Dos decenas de años.", explain: "Hatshepsut gobernó durante unos 20 años." },
      { q: "¿Dónde está el famoso templo de Hatshepsut?", choices: ["Bajo el mar", "En Deir el-Bahari, al pie de los acantilados", "En una montaña de China"], hint: "Tiene filas de columnas junto a los acantilados.", explain: "Su templo está en Deir el-Bahari, cerca de Lúxor, al pie de unos acantilados altos." }
    ]
  },
  'h4-desert-petra': {
    title: "Petra, la ciudad tallada en la roca",
    topicName: "Petra y los nabateos",
    blurb: "Visita una ciudad rosa tallada en los acantilados, donde unos ingenieros muy listos guardaban cada gota de lluvia.",
    reading: [
      { title: "Una ciudad en la roca", text: "Petra está en el desierto de Jordania. Sus grandes edificios están tallados directamente en acantilados de arenisca rosa y roja." },
      { title: "Los nabateos", text: "Petra la construyeron los nabateos, comerciantes que guiaban caravanas de camellos cargadas de incienso y especias. Petra era una parada muy concurrida en sus rutas." },
      { title: "Cada gota cuenta", text: "En Petra casi nunca llueve. Los nabateos construyeron canales, tuberías y depósitos bajo tierra para recoger el agua de la lluvia y de los manantiales, así que la ciudad tenía agua todo el año." },
      { title: "Mostrada al mundo", text: "Durante cientos de años, a Petra la conocía sobre todo la gente de la zona. En 1812, un viajero suizo, Johann Ludwig Burckhardt, la visitó y se la dio a conocer al resto del mundo." }
    ],
    dialogue: {
      npc: { name: "Malik", role: "un ingeniero del agua nabateo, en Petra" },
      intro: "¡Bienvenido a Petra! Soy Malik. Cuidado dónde pisas: este canal lleva nuestra preciosa agua. Aquí cada gota importa.",
      topics: [
        { ask: "¿Cómo se tallan edificios en los acantilados?", answer: "Empezamos por arriba y tallamos hacia abajo, así nunca necesitamos andamios para subir por el acantilado. Nuestros canteros van quitando la roca con herramientas de hierro, poco a poco." },
        { ask: "¿De dónde sacan el agua?", answer: "De los manantiales y de la lluvia. Cuando llueve, el agua baja corriendo por las rocas. La recogemos en canales y la guardamos en grandes depósitos bajo tierra llamados cisternas." },
        { ask: "¿Para qué construyen presas?", answer: "Las tormentas repentinas pueden mandar riadas por nuestro estrecho cañón. Nuestra presa y nuestro túnel desvían el agua de la riada lejos de la ciudad, y guardamos parte para después." },
        { ask: "¿Qué llevan las caravanas?", answer: "Incienso y mirra, resinas de árbol que huelen muy bien y vienen de Arabia, y también especias y telas. Los comerciantes paran aquí a descansar, ¡y nos compran agua!" },
        { ask: "¿Qué es el Tesoro?", answer: "Es un gran edificio tallado en la roca al final del Siq, nuestro cañón largo y estrecho. La gente lo llama el Tesoro, pero lo más probable es que fuera una tumba o un templo, no un lugar para guardar tesoros." }
      ],
      challenge: {
        q: "¿Cómo tenían agua los nabateos en el desierto seco?",
        choices: ["Derretían la nieve de las montañas", "Tenían un lago en el centro de la ciudad", "Recogían agua de lluvia y de manantiales en canales y depósitos"],
        explain: "Recogían el agua de la lluvia y de los manantiales en canales, tuberías y depósitos bajo tierra llamados cisternas."
      },
      farewell: "¡Que te vaya bien, amigo! Y recuerda: en el desierto, el agua es un tesoro."
    },
    timeline: {
      title: "Petra a lo largo del tiempo",
      events: [
        { label: "Los comerciantes nabateos empiezan a asentarse en Petra", when: "hacia 300 a. C." },
        { label: "Se talla el Tesoro en el acantilado", when: "hace unos 2000 años" },
        { label: "Petra pasa a formar parte del Imperio romano", when: "106 d. C." },
        { label: "Burckhardt visita Petra y se la da a conocer al mundo", when: "1812" },
        { label: "Petra es declarada Patrimonio de la Humanidad", when: "1985" }
      ]
    },
    artifact: {
      name: "Una vasija de comercio",
      text: "Los comerciantes llevaban aceite y otras mercancías en vasijas altas de barro como esta. En Petra se han encontrado vasijas y jarras de tierras lejanas, que muestran lo lejos que viajaban sus comerciantes."
    },
    quiz: [
      { q: "¿Qué tienen de especial los edificios de Petra?", choices: ["Flotan en el agua", "Están tallados en acantilados de roca", "Son de hielo"], hint: "Arenisca rosa y roja.", explain: "Los edificios de Petra están tallados directamente en los acantilados de arenisca." },
      { q: "¿Quién construyó Petra?", choices: ["Los nabateos", "Los vikingos", "Los aztecas"], hint: "Eran comerciantes de caravanas.", explain: "Petra la construyeron los nabateos, comerciantes del desierto." },
      { q: "¿Qué es una cisterna?", choices: ["Una silla de montar para camellos", "Un tipo de incienso", "Un depósito bajo tierra para guardar agua"], hint: "Malik guarda en ella el agua de lluvia.", explain: "Una cisterna es un depósito, a menudo bajo tierra, para guardar agua." },
      { q: "¿Por qué construyeron los nabateos una presa y un túnel?", choices: ["Para desviar las riadas repentinas lejos de la ciudad", "Para hacer una piscina", "Para que no entraran los camellos"], hint: "Las tormentas pueden traer riadas repentinas.", explain: "La presa y el túnel desviaban el agua de las riadas lejos de la ciudad, y parte se guardaba para después." },
      { q: "¿En qué año dio Burckhardt a conocer Petra al mundo?", choices: ["1492", "1969", "1812"], hint: "Hace poco más de 200 años.", explain: "Johann Ludwig Burckhardt visitó Petra en 1812." }
    ]
  },

  // ── Oasis 5: Campo de Globos ──
  'h5-desert-rosetta-stone': {
    title: "La piedra de Rosetta y Champollion",
    topicName: "La piedra de Rosetta",
    blurb: "Descifra el código de los jeroglíficos con una piedra y tres tipos de escritura.",
    reading: [
      { title: "Una escritura olvidada", text: "Durante unos 1400 años, nadie supo leer los jeroglíficos. La gente veía los signos en los templos, pero su significado se había perdido." },
      { title: "Una piedra con tres escrituras", text: "En 1799, unos soldados franceses encontraron una losa de piedra rota cerca de la ciudad de Rashid, que los europeos llamaban Rosetta. Tenía el mismo mensaje escrito de tres maneras: en jeroglíficos, en demótico (una escritura egipcia de todos los días) y en griego antiguo." },
      { title: "La clave", text: "Los sabios ya sabían leer el griego antiguo. Así que podían comparar el griego con los jeroglíficos, un poco como si usaran un diccionario." },
      { title: "Champollion", text: "Un joven sabio francés, Jean-François Champollion, sabía muchas lenguas, entre ellas el copto, la última forma de la lengua egipcia. En 1822 mostró cómo funcionan los jeroglíficos: algunos signos representan sonidos, y otros, ideas." }
    ],
    dialogue: {
      npc: { name: "Jean-François Champollion", role: "un sabio francés que aprendió a leer los jeroglíficos" },
      intro: "¡Bonjour! Soy Jean-François Champollion. Desde niño he soñado con leer la escritura del antiguo Egipto. ¿Quieres que te enseñe cómo descifré el código?",
      topics: [
        { ask: "¿Qué dice la piedra de Rosetta?", answer: "Es un mensaje de los sacerdotes de Egipto, del año 196 a. C., que alaba al joven rey Ptolomeo V. ¡No es muy emocionante, lo reconozco! Pero está escrito de tres maneras, y eso lo convierte en un tesoro." },
        { ask: "¿Por qué tres tipos de escritura?", answer: "En aquella época, a Egipto lo gobernaban reyes que hablaban griego. Así que los sacerdotes escribieron el mensaje en jeroglíficos para los templos, en demótico para los egipcios de a pie y en griego para los gobernantes." },
        { ask: "¿Cómo descifraste el código?", answer: "Estudié los nombres reales que había dentro de unos anillos ovalados llamados cartuchos, como Ptolomeo y Cleopatra. Los nombres me ayudaron a emparejar signos con sonidos. ¡Luego vi que los signos de sonido y los de idea van mezclados!" },
        { ask: "¿Te ayudó alguien?", answer: "Un científico inglés, Thomas Young, dio los primeros pasos importantes con el nombre de Ptolomeo. Y el copto, una lengua que nació del egipcio antiguo, me ayudó a oír las palabras antiguas." },
        { ask: "¿Qué pasó cuando lo resolviste?", answer: "Dicen que corrí a la oficina de mi hermano gritando «¡Lo tengo!», y que luego me desmayé de tanta emoción. Es una buena historia, ¿verdad?" }
      ],
      challenge: {
        q: "¿Por qué la piedra de Rosetta fue la clave para leer los jeroglíficos?",
        choices: ["Tenía un diccionario con dibujos por detrás", "Tenía el mismo mensaje en griego, que los sabios ya sabían leer", "Era de oro"],
        explain: "El mismo mensaje estaba escrito en griego, que los sabios sabían leer, así que podían compararlo con los jeroglíficos."
      },
      farewell: "¡Au revoir! Recuerda: todo enigma se puede resolver si tienes curiosidad y paciencia."
    },
    timeline: {
      title: "Descifrar el código",
      events: [
        { label: "Los sacerdotes de Egipto mandan tallar el decreto en la piedra", when: "196 a. C." },
        { label: "Se tallan los últimos jeroglíficos conocidos", when: "394 d. C." },
        { label: "Unos soldados franceses encuentran la piedra de Rosetta", when: "1799" },
        { label: "La piedra se expone en el Museo Británico", when: "1802" },
        { label: "Champollion explica cómo funcionan los jeroglíficos", when: "1822" }
      ]
    },
    artifact: {
      name: "La piedra de Rosetta",
      text: "La verdadera piedra de Rosetta es una losa de piedra oscura de poco más de un metro de alto, con tres franjas de escritura. Le faltan trozos por los bordes. Es uno de los objetos más visitados del Museo Británico, en Londres."
    },
    quiz: [
      { q: "¿Qué tres tipos de escritura hay en la piedra de Rosetta?", choices: ["Jeroglíficos, demótico y griego", "Inglés, francés y alemán", "Chino, árabe y latín"], hint: "Una de ellas los sabios ya sabían leerla.", explain: "La piedra tiene el mismo mensaje en jeroglíficos, en demótico y en griego antiguo." },
      { q: "¿Dónde se encontró la piedra de Rosetta?", choices: ["En París", "Dentro de una pirámide", "Cerca de la ciudad de Rashid (Rosetta), en Egipto"], hint: "Su nombre te da la pista.", explain: "Unos soldados franceses la encontraron en 1799 cerca de Rashid, que los europeos llamaban Rosetta." },
      { q: "¿Quién mostró en 1822 cómo leer los jeroglíficos?", choices: ["Howard Carter", "Jean-François Champollion", "Imhotep"], hint: "Un sabio francés que sabía copto.", explain: "Champollion mostró en 1822 que los jeroglíficos mezclan signos de sonido y signos de idea." },
      { q: "¿Qué son los cartuchos?", choices: ["Anillos ovalados dibujados alrededor de los nombres reales", "Sillas para montar en camello", "Piedras de las pirámides"], hint: "El nombre de Ptolomeo estaba dentro de uno.", explain: "Un cartucho es un anillo ovalado dibujado alrededor del nombre de un rey o una reina." },
      { q: "¿Durante cuánto tiempo, más o menos, nadie supo leer los jeroglíficos?", choices: ["Unos 14 años", "Unos 140 años", "Unos 1400 años"], hint: "Desde el 394 d. C. hasta 1822.", explain: "Desde los últimos jeroglíficos, en el 394 d. C., hasta Champollion, en 1822, pasaron unos 1400 años." }
    ]
  },
  'h5-desert-ibn-battuta': {
    title: "El gran viaje de Ibn Battuta",
    topicName: "Ibn Battuta",
    blurb: "Cruza desiertos y mares con uno de los mayores viajeros de todos los tiempos.",
    reading: [
      { title: "Salir de casa", text: "En 1325, un joven de 21 años llamado Ibn Battuta salió de su casa en Tánger, Marruecos. Partió en peregrinación a La Meca, ¡y no volvió a casa hasta 24 años después!" },
      { title: "Por todo el mundo que conocía", text: "Viajó por el norte de África, Oriente Medio, el este de África, la India y hasta China. En total recorrió unos 117 000 km, casi tres veces la vuelta a la Tierra." },
      { title: "A través del Sahara", text: "Más tarde, en 1352, cruzó el Sahara con una caravana de camellos para visitar el Imperio de Malí. Por el camino se detuvo en Tagaza, donde hasta las casas estaban hechas de sal." },
      { title: "Un libro famoso", text: "De vuelta en Marruecos, le contó sus aventuras a un escritor, Ibn Yuzayy, que las puso por escrito. El libro se llama la Rihla, que significa «El viaje»." }
    ],
    dialogue: {
      npc: { name: "Ibn Battuta", role: "un viajero y juez de Marruecos" },
      intro: "¡Bienvenido, compañero de viaje! Soy Ibn Battuta. He visto más mundo del que jamás soñé. Siéntate en este cojín y te contaré mis historias.",
      topics: [
        { ask: "¿Por qué empezaste a viajar?", answer: "Salí en peregrinación a La Meca. ¡Pero por el camino me enamoré de viajar! Intenté no recorrer nunca dos veces el mismo camino." },
        { ask: "¿Cómo viajabas?", answer: "A pie, en burro, a caballo, en camello y en barco. Me unía a las caravanas para ir seguro y acompañado, porque viajar solo por el desierto es peligroso." },
        { ask: "¿Cómo fue cruzar el Sahara?", answer: "Calor de día, frío de noche, y mucho, mucho silencio. ¡En Tagaza, hasta las casas estaban hechas de bloques de sal! Nuestro guía sabía dónde estaba cada pozo, y lo seguíamos muy de cerca." },
        { ask: "¿Trabajaste durante tus viajes?", answer: "¡Sí! Había estudiado leyes, así que en Delhi y en las Maldivas trabajé como juez. Los gobernantes solían recibir bien a los sabios viajeros." },
        { ask: "¿Cómo conocemos tu historia?", answer: "Cuando volví a casa, el sultán de Marruecos me pidió que se lo contara todo a un escritor llamado Ibn Yuzayy. Juntos hicimos un libro llamado la Rihla. La gente todavía lo lee hoy." }
      ],
      challenge: {
        q: "¿Por qué viajaba Ibn Battuta con caravanas?",
        choices: ["Los camellos eran más rápidos que los barcos", "Para ir seguro y acompañado", "Le gustaba cargar sal"],
        explain: "Viajar solo por el desierto era peligroso, así que se unía a las caravanas para ir seguro y acompañado."
      },
      farewell: "¡Que tus caminos sean largos y tus amigos, muchos! Ve a conocer el mundo."
    },
    timeline: {
      title: "Los viajes de Ibn Battuta",
      events: [
        { label: "Ibn Battuta nace en Tánger", when: "1304" },
        { label: "Parte hacia La Meca, con 21 años", when: "1325" },
        { label: "Llega a China por mar", when: "hacia 1345" },
        { label: "Vuelve a casa, a Marruecos", when: "1349" },
        { label: "Cruza el Sahara hasta el Imperio de Malí", when: "1352" },
        { label: "Sus viajes se ponen por escrito en la Rihla", when: "1355" }
      ]
    },
    artifact: {
      name: "Un astrolabio",
      text: "Un astrolabio es un instrumento de latón para medir a qué altura están el Sol y las estrellas en el cielo. En la época de Ibn Battuta, los sabios usaban astrolabios para saber la hora, encontrar direcciones y estudiar el cielo."
    },
    quiz: [
      { q: "¿Dónde empezó el viaje de Ibn Battuta?", choices: ["En Londres", "En Pekín", "En Tánger, Marruecos"], hint: "Una ciudad del norte de África.", explain: "Partió de su ciudad natal, Tánger, en Marruecos, en 1325." },
      { q: "¿Para qué se puso en camino la primera vez?", choices: ["Para ir en peregrinación a La Meca", "Para buscar oro", "Para vender camellos"], hint: "Un viaje sagrado.", explain: "Primero salió en peregrinación a La Meca, y después siguió viajando." },
      { q: "¿Más o menos cuánto recorrió en total?", choices: ["Unos 1200 km", "Unos 117 000 km", "Unos 10 km"], hint: "Casi tres veces la vuelta a la Tierra.", explain: "Recorrió unos 117 000 km, casi tres veces la vuelta a la Tierra." },
      { q: "¿De qué estaban hechas las casas de Tagaza?", choices: ["De hielo", "De vidrio", "De bloques de sal"], hint: "Era un pueblo de minas de sal.", explain: "Tagaza era un pueblo de minas de sal en el Sahara, y sus casas estaban hechas con bloques de sal." },
      { q: "¿Qué es la Rihla?", choices: ["El libro de sus viajes", "Un tipo de camello", "Un barco"], hint: "Su nombre significa «El viaje».", explain: "La Rihla es el libro de los viajes de Ibn Battuta, que puso por escrito Ibn Yuzayy." }
    ]
  },

  // ── Oasis 6: Biblioteca de Papiros ──
  'h6-desert-library-alexandria': {
    title: "La gran biblioteca de Alejandría",
    topicName: "La biblioteca de Alejandría",
    blurb: "Copia rollos en la biblioteca más famosa del mundo antiguo.",
    reading: [
      { title: "Una ciudad del saber", text: "Alejandría, en la costa de Egipto, la fundó Alejandro Magno en el 331 a. C. Los reyes que vinieron después, los Ptolomeos, querían que fuera la ciudad más sabia del mundo." },
      { title: "La gran biblioteca", text: "Hace unos 2300 años construyeron una gran biblioteca junto a un centro de investigación llamado el Museion. Sabios de muchas tierras iban allí a leer, escribir, enseñar y hacer experimentos." },
      { title: "Libros en rollos", text: "No había libros impresos. Cada libro era un rollo de papiro copiado a mano. Nadie sabe exactamente cuántos había, pero quizá eran decenas o incluso cientos de miles." },
      { title: "Grandes pensadores", text: "Euclides escribió en Alejandría un famoso libro de geometría, y Eratóstenes, el director de la biblioteca, midió el tamaño de la Tierra. A lo largo de cientos de años, la biblioteca fue desapareciendo poco a poco." }
    ],
    dialogue: {
      npc: { name: "Kleo", role: "una copista de rollos de la biblioteca de Alejandría, hacia 240 a. C." },
      intro: "¡Chis! Te doy la bienvenida a la gran biblioteca. Soy Kleo y copio rollos. Ven a ver los estantes: ¡aquí hay más libros que en ningún otro lugar del mundo!",
      topics: [
        { ask: "¿De dónde salen todos los rollos?", answer: "¡De todas partes! Dicen que los hombres del rey revisan los barcos del puerto en busca de libros, los copian y los guardan aquí. Nuestros reyes compran y piden prestados libros de todo el mundo." },
        { ask: "¿Qué es el Museion?", answer: "Significa «el lugar de las Musas», las diosas del saber y de las artes. Los sabios viven y trabajan allí, pagados por el rey, con jardines para pasear y una sala para comer. ¡De ahí viene tu palabra museo!" },
        { ask: "¿Quién trabaja aquí?", answer: "Matemáticos, médicos, astrónomos, poetas y cartógrafos. Euclides escribió aquí su libro de geometría, antes de mi época. ¡Y nuestro director, Eratóstenes, ha calculado lo grande que es la Tierra!" },
        { ask: "¿Cómo se copia un rollo?", answer: "Despacio y con cuidado, con una pluma de junco y tinta sobre papiro nuevo. Un descuido y una palabra queda mal para siempre, así que reviso cada línea dos veces." },
        { ask: "¿Por qué aquí importa tanto aprender?", answer: "¡Porque el saber crece cuando se comparte! Aquí los sabios comparan ideas, revisan el trabajo de los demás y escriben libros nuevos para que los lean los sabios que vendrán." }
      ],
      challenge: {
        q: "¿Cómo eran los libros de la gran biblioteca?",
        choices: ["Libros impresos de bolsillo", "Libros electrónicos", "Rollos de papiro copiados a mano"],
        explain: "Cada libro era un rollo de papiro, copiado a mano."
      },
      farewell: "Vuelve cuando quieras. En una biblioteca puedes viajar por todo el mundo sin levantarte de la silla."
    },
    timeline: {
      title: "La biblioteca de Alejandría",
      events: [
        { label: "Alejandro Magno funda Alejandría", when: "331 a. C." },
        { label: "Euclides escribe su famoso libro de geometría, los Elementos", when: "hacia 300 a. C." },
        { label: "Se construyen la gran biblioteca y el Museion", when: "hacia 285 a. C." },
        { label: "Eratóstenes, el director de la biblioteca, mide la Tierra", when: "hacia 240 a. C." },
        { label: "Se inaugura en Alejandría una gran biblioteca nueva, la Bibliotheca Alexandrina", when: "2002" }
      ]
    },
    artifact: {
      name: "Un rollo de papiro",
      text: "Un rollo se guardaba enrollado en un hueco de un estante, con una etiquetita colgando que mostraba su título. Un libro largo necesitaba muchos rollos."
    },
    quiz: [
      { q: "¿Quién fundó la ciudad de Alejandría?", choices: ["Julio César", "Alejandro Magno", "Ramsés II"], hint: "La ciudad lleva su nombre.", explain: "Alejandro Magno fundó Alejandría en el 331 a. C." },
      { q: "¿De qué estaban hechos los libros de la biblioteca?", choices: ["Rollos de papiro", "Papel impreso", "Ladrillos de arcilla"], hint: "Kleo los copia a mano.", explain: "Los libros eran rollos de papiro copiados a mano." },
      { q: "¿Qué palabra viene del Museion?", choices: ["Mesa", "Mono", "Museo"], hint: "Un lugar lleno de tesoros de los que aprender.", explain: "Museo viene del Museion, «el lugar de las Musas»." },
      { q: "¿Qué sabio midió el tamaño de la Tierra?", choices: ["Eratóstenes", "Euclides", "Champollion"], hint: "Era el director de la biblioteca.", explain: "Eratóstenes, el director de la biblioteca, midió la Tierra usando sombras." },
      { q: "¿Qué le pasó a la gran biblioteca?", choices: ["La trasladaron a Londres", "Fue desapareciendo poco a poco a lo largo de cientos de años", "Sigue abierta en el mismo edificio"], hint: "No pasó todo de golpe.", explain: "A lo largo de cientos de años hubo menos dinero y menos sabios, y la biblioteca fue desapareciendo poco a poco." }
    ]
  },
  'h6-desert-timbuktu': {
    title: "Los manuscritos de Tombuctú",
    topicName: "Los manuscritos de Tombuctú",
    blurb: "Abre los libros antiguos de una ciudad de sabios al borde del Sahara.",
    reading: [
      { title: "Una ciudad al borde del desierto", text: "Tombuctú está en Malí, cerca del río Níger, en el borde sur del Sahara. Allí se encontraban las caravanas de camellos del desierto con los barcos del río." },
      { title: "Una ciudad de sabios", text: "Hace unos 600 años, Tombuctú estaba llena de sabios y estudiantes. Estudiaban en mezquitas como la de Sankoré y en casa de sus maestros, y aprendían matemáticas, astronomía, medicina, leyes y poesía." },
      { title: "Libros valiosos", text: "La gente compraba libros a los comerciantes que cruzaban el desierto y los copiaba a mano. Las familias guardaron estos manuscritos durante cientos de años." },
      { title: "Salvar los manuscritos", text: "En 2012, la ciudad no era un lugar seguro. Bibliotecarios y familias metieron cientos de miles de manuscritos en cajas y los llevaron en silencio a un lugar seguro, en la ciudad de Bamako." }
    ],
    dialogue: {
      npc: { name: "Fatoumata", role: "una guardiana de manuscritos familiares de Tombuctú" },
      intro: "¡Te doy la bienvenida a Tombuctú! Soy Fatoumata. Mi familia ha cuidado estos libros antiguos durante muchas generaciones. ¿Quieres verlos? ¡Con cuidado, por favor!",
      topics: [
        { ask: "¿Qué dicen los manuscritos?", answer: "¡Muchísimas cosas! Cómo seguir la Luna y las estrellas, cómo curar enfermedades, cómo resolver discusiones de forma justa, problemas de matemáticas, poemas y cartas entre sabios." },
        { ask: "¿Con qué están escritos?", answer: "Casi todos están escritos con letras árabes, con tinta hecha de plantas y hollín, sobre papel traído a través del Sahara. Algunos usan las letras árabes para escribir lenguas africanas como el songhay y el fula." },
        { ask: "¿Por qué eran tan valiosos los libros?", answer: "Hace mucho tiempo, un visitante escribió que en Tombuctú se ganaba más dinero vendiendo libros que vendiendo cualquier otra cosa. Los libros llevaban saber, y el saber era un tesoro." },
        { ask: "¿Cómo los mantienes a salvo?", answer: "Lejos de la humedad, los insectos y la luz del sol. Hoy los guardamos en cajas especiales, y fotografiamos cada página para que las palabras no se pierdan nunca." },
        { ask: "¿Cómo los salvaron en 2012?", answer: "Cuando la ciudad no era segura, bibliotecarios y familias escondieron los manuscritos en cajas de metal y los llevaron, unos pocos cada vez, a la ciudad de Bamako. ¡Se salvaron cientos de miles!" }
      ],
      challenge: {
        q: "¿Por qué la gente de Tombuctú apreciaba tanto los libros?",
        choices: ["Los libros llevaban saber, y el saber era valioso", "Los libros eran de oro", "Los libros se usaban como platos"],
        explain: "Los libros llevaban saber sobre matemáticas, las estrellas, la medicina, las leyes y mucho más, y ese saber era un tesoro."
      },
      farewell: "Gracias por tu visita. Lee todo lo que puedas: cada libro es un pequeño cofre del tesoro."
    },
    timeline: {
      title: "Los libros de Tombuctú",
      events: [
        { label: "Tombuctú empieza siendo un campamento para viajeros del desierto", when: "hacia el año 1100" },
        { label: "Mansa Musa manda construir la gran mezquita de Djinguereber", when: "hacia 1327" },
        { label: "Tombuctú es famosa por sus sabios y sus libros", when: "hacia 1500" },
        { label: "Un visitante escribe que vender libros da más dinero que cualquier otro comercio", when: "hacia 1526" },
        { label: "Los bibliotecarios ponen a salvo los manuscritos", when: "2012" }
      ]
    },
    artifact: {
      name: "Un manuscrito de Tombuctú",
      text: "Muchos manuscritos se guardaban como hojas sueltas dentro de una cubierta de cuero, a veces atada con una correa. Sus páginas tienen una letra preciosa en tinta negra y roja, con notas en los márgenes de lectores de hace mucho tiempo."
    },
    quiz: [
      { q: "¿Dónde está Tombuctú?", choices: ["En la selva amazónica", "En Malí, en el borde sur del Sahara", "En la Antártida"], hint: "Cerca del río Níger.", explain: "Tombuctú está en Malí, cerca del río Níger, en el borde sur del Sahara." },
      { q: "¿Qué estudiaban los sabios de Tombuctú?", choices: ["Solo cocina", "Nada de nada", "Matemáticas, astronomía, medicina, leyes y poesía"], hint: "¡Muchas materias!", explain: "Los sabios estudiaban matemáticas, astronomía, medicina, leyes, poesía y mucho más." },
      { q: "¿Cómo se hacían los manuscritos?", choices: ["Se escribían a mano", "Con una impresora", "Con una cámara"], hint: "No había imprentas.", explain: "Los manuscritos se escribían y se copiaban a mano." },
      { q: "¿Cómo pusieron a salvo los manuscritos en 2012?", choices: ["Los enterraron en la arena para siempre", "Los llevaron en cajas a un lugar seguro", "Los tiraron al río"], hint: "Unos pocos cada vez, hasta Bamako.", explain: "Bibliotecarios y familias llevaron cientos de miles de manuscritos a un lugar seguro, en Bamako." },
      { q: "¿Por qué hoy se fotografían las páginas?", choices: ["Para hacer pósteres", "Para comprobar los colores", "Para que el saber no se pierda nunca"], hint: "El papel viejo se puede estropear.", explain: "Las fotos guardan una copia de cada página, así que el saber no se perderá nunca." }
    ]
  },

  // ── Oasis 7: Campamento Estrellado ──
  'h7-desert-tutankhamun': {
    title: "Howard Carter y la tumba de Tutankamón",
    topicName: "La tumba de Tutankamón",
    blurb: "Encuentra la tumba más famosa jamás descubierta y aprende por qué importa trabajar con cuidado.",
    reading: [
      { title: "Un rey joven", text: "Tutankamón se convirtió en faraón con unos 9 años, hacia 1332 a. C., y reinó unos 10 años. En su época no era uno de los reyes más famosos de Egipto." },
      { title: "El Valle de los Reyes", text: "Muchos faraones fueron enterrados en tumbas excavadas en la roca de un valle del desierto, cerca de Lúxor. Casi todas esas tumbas las vaciaron los ladrones hace mucho tiempo." },
      { title: "La búsqueda", text: "Howard Carter, un arqueólogo inglés, buscó en el valle durante años, con el dinero de lord Carnarvon. El 4 de noviembre de 1922, su equipo encontró un escalón tallado en la roca. Bajaba hasta una puerta sellada." },
      { title: "Cosas maravillosas", text: "Cuando Carter se asomó por primera vez a la luz de una vela, Carnarvon le preguntó si veía algo. Carter respondió: «¡Sí, cosas maravillosas!». La tumba guardaba más de 5000 objetos, entre ellos una máscara de oro." }
    ],
    dialogue: {
      npc: { name: "Howard Carter", role: "un arqueólogo y artista inglés" },
      intro: "¡Buenos días! Howard Carter, arqueólogo. Pasé años excavando en este valle y no encontré casi nada. Luego, una mañana de noviembre de 1922, todo cambió. Deja que te lo cuente.",
      topics: [
        { ask: "¿Cómo encontraste la tumba?", answer: "Mi equipo estaba retirando los restos de unas viejas cabañas de obreros cerca de la tumba de Ramsés VI. Debajo había un escalón tallado en la roca, y luego quince más, que bajaban hasta una puerta sellada." },
        { ask: "¿Qué viste primero?", answer: "Hice un agujerito y levanté una vela. Al principio no vi nada, mientras mis ojos se acostumbraban a la luz. Luego aparecieron formas: animales extraños, estatuas y oro; por todas partes, el brillo del oro." },
        { ask: "¿Por qué estaba la tumba tan llena?", answer: "Unos ladrones entraron poco después del entierro, pero solo se llevaron cosas pequeñas, y la tumba se volvió a sellar. Más tarde, los escombros de otras excavaciones taparon la entrada, y se olvidó durante más de 3000 años." },
        { ask: "¿Qué encontraste?", answer: "Más de 5000 cosas: carros, camas, juegos de mesa, ropa, tarros de comida, un trono de oro y una máscara de oro. Cada objeto había que dibujarlo, fotografiarlo y describirlo por escrito antes de moverlo." },
        { ask: "¿Cuánto duró el trabajo?", answer: "¡Diez años! Trabajamos despacio y con cuidado, porque algunos objetos eran muy frágiles. Trabajar con cuidado importa más que trabajar deprisa." }
      ],
      challenge: {
        q: "¿Por qué la tumba de Tutankamón seguía tan llena de tesoros?",
        choices: ["A los ladrones les daban miedo los camellos", "Estaba bajo el agua", "Su entrada quedó escondida y olvidada durante más de 3000 años"],
        explain: "Los escombros taparon la entrada, así que la tumba se olvidó durante más de 3000 años y casi se libró de los ladrones."
      },
      farewell: "Recuerda: el verdadero tesoro no es solo el oro. Es lo que estos objetos nos enseñan sobre la gente de hace mucho tiempo."
    },
    timeline: {
      title: "La tumba de Tutankamón",
      events: [
        { label: "Tutankamón se convierte en faraón, con unos 9 años", when: "hacia 1332 a. C." },
        { label: "Entierran a Tutankamón en el Valle de los Reyes", when: "hacia 1323 a. C." },
        { label: "Howard Carter empieza a excavar en el valle para lord Carnarvon", when: "1917" },
        { label: "El equipo de Carter encuentra el primer escalón de la tumba", when: "1922" },
        { label: "Se descubre la máscara de oro", when: "1925" },
        { label: "Se sacan de la tumba los últimos objetos", when: "1932" }
      ]
    },
    artifact: {
      name: "La máscara de oro de Tutankamón",
      text: "La máscara es de oro, con incrustaciones de vidrio azul y de piedras como el lapislázuli. Pesa unos 10 kilos. Muestra al joven rey con el tocado de rayas llamado nemes."
    },
    quiz: [
      { q: "¿Cuántos años tenía Tutankamón cuando se convirtió en faraón?", choices: ["Unos 9", "Unos 40", "Unos 70"], hint: "Era un niño.", explain: "Tutankamón se convirtió en faraón con unos 9 años." },
      { q: "¿El equipo de quién encontró la tumba de Tutankamón en 1922?", choices: ["El de Champollion", "El de Howard Carter", "El de Imhotep"], hint: "Un arqueólogo inglés.", explain: "El equipo de Howard Carter encontró la tumba el 4 de noviembre de 1922." },
      { q: "¿Qué dijo Carter cuando se asomó por primera vez?", choices: ["«¡Está vacía!»", "«¡Está muy oscuro!»", "«¡Cosas maravillosas!»"], hint: "Vio el brillo del oro.", explain: "Cuando le preguntaron si veía algo, Carter dijo: «¡Sí, cosas maravillosas!»." },
      { q: "¿Más o menos cuántos objetos había en la tumba?", choices: ["Unos 50", "Más de 5000", "Unos 500"], hint: "¡Miles!", explain: "La tumba guardaba más de 5000 objetos." },
      { q: "¿Por qué el trabajo duró diez años?", choices: ["Cada objeto se registró y se movió con cuidado", "Los trabajadores estaban de vacaciones", "La tumba no paraba de moverse"], hint: "Algunas cosas eran frágiles.", explain: "Cada objeto se dibujó, se fotografió y se describió por escrito, y luego se movió con mucho cuidado." }
    ]
  },
  'h7-desert-abu-simbel': {
    title: "El traslado de los templos de Abu Simbel",
    topicName: "Abu Simbel",
    blurb: "Ayuda a ingenieros de todo el mundo a subir dos templos gigantes por encima del agua que sube.",
    reading: [
      { title: "Estatuas gigantes", text: "Hace unos 3200 años, el faraón Ramsés II mandó tallar dos templos en un acantilado de arenisca en Abu Simbel, junto al Nilo. Cuatro estatuas gigantes de él, sentadas, de unos 20 metros de alto cada una, vigilan la puerta." },
      { title: "La luz del sol, puntual", text: "El gran templo estaba orientado hacia la salida del sol. Dos veces al año, en febrero y en octubre, la luz de la mañana llega hasta el fondo e ilumina las estatuas de la sala más interior." },
      { title: "El agua que sube", text: "En los años sesenta, Egipto construyó la presa alta de Asuán. Su enorme lago nuevo, el lago Nasser, iba a cubrir los templos. Gente de todo el mundo se unió a un rescate dirigido por la UNESCO." },
      { title: "Cortar, subir, reconstruir", text: "Los ingenieros cortaron los templos en más de 1000 bloques enormes, los subieron por la colina y los volvieron a montar unos 65 metros más arriba. El trabajo duró de 1964 a 1968." }
    ],
    dialogue: {
      npc: { name: "Samira", role: "una ingeniera del rescate de Abu Simbel, en los años sesenta" },
      intro: "¡Hola! Soy Samira, ingeniera. Tenemos un trabajo enorme: salvar dos templos gigantes del agua que sube. ¿Quieres ver cómo lo haremos?",
      topics: [
        { ask: "¿Por qué hay que mover los templos?", answer: "La nueva presa va a formar un lago gigante. Si dejamos los templos aquí, acabarán muy por debajo del agua. Así que los vamos a subir a un terreno más alto." },
        { ask: "¿Cómo se corta un templo?", answer: "¡Con muchísimo cuidado! Usamos sierras, no explosivos, porque las grandes explosiones podrían agrietar las tallas. Los cortes son finos y después se rellenan, para que casi no se vean." },
        { ask: "¿Cuánto pesan los bloques?", answer: "Muchos pesan unas 20 toneladas, ¡tanto como tres o cuatro elefantes! Unas grúas levantan cada uno, y cada bloque lleva un número para saber exactamente dónde va." },
        { ask: "¿La luz del sol seguirá funcionando?", answer: "Medimos los ángulos con muchísimo cuidado. En el nuevo lugar, la luz del sol sigue llegando a las estatuas del interior, solo con más o menos un día de diferencia respecto a antes." },
        { ask: "¿Quién está ayudando?", answer: "Ingenieros, arqueólogos y trabajadores de Egipto y de muchos otros países, y dinero de todo el mundo. Eso demuestra que a la gente de todas partes le importa el pasado." }
      ],
      challenge: {
        q: "¿Por qué trasladaron los templos de Abu Simbel?",
        choices: ["Un lago nuevo de la presa alta de Asuán los habría cubierto", "Estaban en medio de una carretera", "Ramsés quería mejores vistas"],
        explain: "La presa alta de Asuán formó el lago Nasser, que habría inundado los templos, así que los subieron más arriba."
      },
      farewell: "¡Gracias por ayudar! Cuando visites Abu Simbel algún día, busca las líneas finas entre los bloques. Son nuestro secreto."
    },
    timeline: {
      title: "Abu Simbel",
      events: [
        { label: "Se tallan los templos de Ramsés II en Abu Simbel", when: "hacia 1264 a. C." },
        { label: "Burckhardt ve las cabezas de las estatuas asomando entre la arena", when: "1813" },
        { label: "Unos exploradores apartan la arena y entran", when: "1817" },
        { label: "La UNESCO pide al mundo que ayude a salvar los templos de Nubia", when: "1960" },
        { label: "Los templos se cortan en bloques y se trasladan", when: "1964–1968" },
        { label: "Abu Simbel pasa a formar parte de un lugar Patrimonio de la Humanidad", when: "1979" }
      ]
    },
    artifact: {
      name: "Una maqueta de las grandes estatuas de Abu Simbel",
      text: "Los cuatro gigantes sentados de la fachada del gran templo representan a Ramsés II. Hace mucho tiempo, un terremoto rompió la parte de arriba de uno de ellos, y su cabeza sigue en el suelo, a sus pies."
    },
    quiz: [
      { q: "¿Quién mandó tallar los templos de Abu Simbel?", choices: ["Tutankamón", "Alejandro Magno", "Ramsés II"], hint: "Sus estatuas vigilan la puerta.", explain: "El faraón Ramsés II mandó tallar los templos hace unos 3200 años." },
      { q: "¿Qué pasa dos veces al año dentro del gran templo?", choices: ["La luz del sol llega a las estatuas de la sala más interior", "Nieva", "Las estatuas cantan"], hint: "El templo mira hacia la salida del sol.", explain: "En febrero y en octubre, la luz de la mañana llega hasta las estatuas del interior." },
      { q: "¿Por qué hubo que trasladar los templos?", choices: ["Se estaban hundiendo en la arena", "El lago nuevo de una presa los habría cubierto", "La gente los quería en un museo"], hint: "Piensa en el lago Nasser.", explain: "El lago de la presa alta de Asuán habría cubierto los templos." },
      { q: "¿Más o menos en cuántos bloques se cortaron los templos?", choices: ["Unos 10", "Alrededor de 1 millón", "Más de 1000"], hint: "Cada uno pesaba toneladas.", explain: "Los templos se cortaron en más de 1000 bloques enormes." },
      { q: "¿Cuánto más arriba, más o menos, se reconstruyeron los templos?", choices: ["Unos 65 metros más arriba", "Alrededor de 1 metro más arriba", "Unos 6 kilómetros más arriba"], hint: "Colina arriba, a salvo del lago.", explain: "Los templos se reconstruyeron unos 65 metros más arriba que antes." }
    ]
  },

  // ───────── Observatorio del Sol (física) ─────────
  // ── Oasis 1: Puerta de la Esfinge ──
  'p1-desert-palm-shade': {
    title: "Sombra bajo las palmeras",
    topicName: "La luz y las sombras",
    blurb: "Haz que las sombras crezcan y se encojan, y encuentra el lugar más fresco del oasis.",
    reading: [
      { title: "Un sol que quema", text: "En el desierto, el Sol brilla fuerte y calienta mucho. Los camellos, los zorros y las personas buscan un lugar con sombra para descansar." },
      { title: "¿Qué es la sombra?", text: "Una palmera tapa la luz del sol, así que al suelo de detrás le llega menos luz. Esa mancha oscura es su sombra, y allí hace más fresco." },
      { title: "La luz va en línea recta", text: "La luz viaja en línea recta. No puede doblarse para rodear la palmera, así que el lugar de detrás se queda en sombra." },
      { title: "Las sombras se mueven", text: "Mientras el Sol cruza el cielo, las sombras se mueven y cambian de tamaño. A mediodía son cortas. Por la mañana y al atardecer son largas." }
    ],
    sim: {
      predict: {
        q: "Acercas la linterna al juguete. ¿Qué le pasa a su sombra?",
        choices: ["Se hace más grande", "Se hace más pequeña", "Desaparece"],
        explain: "Cerca de la linterna, el juguete tapa mucha luz, así que su sombra se hace grande."
      }
    },
    quiz: [
      { q: "¿Qué hace que haya una sombra?", choices: ["El viento que mueve la arena", "Algo que tapa la luz", "Agua en el suelo"], hint: "Necesitas luz y algo que se ponga en medio.", explain: "Una sombra se forma cuando algo tapa la luz." },
      { q: "¿Por qué hace más fresco a la sombra de una palmera?", choices: ["El árbol tapa la luz caliente del sol", "El árbol sopla aire frío", "La arena está mojada"], hint: "¿Qué se pone delante del Sol?", explain: "La palmera tapa la luz caliente del sol, así que su sombra es más fresca." },
      { q: "¿Cuándo son más cortas las sombras?", choices: ["Temprano por la mañana", "Al final de la tarde", "Hacia el mediodía"], hint: "¿Cuándo está el Sol más alto en el cielo?", explain: "Hacia el mediodía, el Sol está alto en el cielo, así que las sombras son cortas." },
      { q: "¿Puede la luz doblarse para rodear una palmera?", choices: ["Sí, se curva a su alrededor", "No, viaja en línea recta"], hint: "Por eso hay sombras.", explain: "La luz viaja en línea recta, así que no puede llegar detrás del árbol. Así se forma una sombra." },
      { q: "¿Por qué un fénec, el zorrito del desierto, descansa a la sombra a mediodía?", choices: ["Para encontrar agua", "Para buscar oro", "Para estar fresco"], hint: "El sol de mediodía calienta muchísimo.", explain: "La sombra tapa la luz caliente del sol, así que descansar allí mantiene fresco al zorro." }
    ]
  },
  'p1-desert-reed-boats': {
    title: "Flotar en el Nilo",
    topicName: "Flotar y hundirse",
    blurb: "Echa cosas al tanque de agua. ¿Cuáles flotan como una barca de juncos en el Nilo?",
    reading: [
      { title: "Barcas de juncos", text: "Hace mucho tiempo, los egipcios ataban manojos de juncos de papiro para hacer barcas ligeras. Los tallos de junco están llenos de bolsitas de aire diminutas, así que flotan." },
      { title: "Flotar o hundirse", text: "Las cosas que se quedan encima del agua flotan. Las cosas que bajan hasta el fondo se hunden." },
      { title: "No depende del tamaño", text: "Un tronco grande flota, pero una piedrita se hunde. Importa más de qué está hecha una cosa que lo grande que sea." },
      { title: "Barcos de madera", text: "Más tarde, los egipcios construyeron barcos más grandes de madera, con velas. Las falucas, los veleros que hoy navegan por el Nilo, también son de madera." }
    ],
    sim: {
      predict: {
        q: "¿La manzana flotará o se hundirá en el tanque de agua?",
        choices: ["Flota", "Se hunde"],
        explain: "¡La manzana flota! Tiene mucho aire dentro, un poco como las bolsitas de aire de un junco."
      }
    },
    quiz: [
      { q: "¿Con qué hacían barcas ligeras los antiguos egipcios?", choices: ["Con piedras", "Con manojos de juncos de papiro", "Con vidrio"], hint: "Una planta alta que crece junto al Nilo.", explain: "Ataban manojos de juncos de papiro para hacer barcas ligeras." },
      { q: "¿Por qué flotan los tallos de junco?", choices: ["Están llenos de bolsitas de aire diminutas", "Pesan muchísimo", "Son de metal"], hint: "¿Qué hay dentro de los tallos?", explain: "Los tallos de junco están llenos de bolsitas de aire diminutas, que los ayudan a flotar." },
      { q: "¿Cuál se hunde?", choices: ["Un corcho", "Un bloque de madera", "Una moneda"], hint: "Es de metal.", explain: "Una moneda es de metal macizo, así que se hunde. El corcho y la madera flotan." },
      { q: "Un tronco grande y una piedrita caen al Nilo. ¿Cuál flota?", choices: ["El tronco grande", "La piedrita"], hint: "No lo decide el tamaño.", explain: "El tronco grande flota y la piedrita se hunde. Importa más de qué está hecha una cosa que su tamaño." },
      { q: "¿Qué es una faluca?", choices: ["Un tipo de camello", "Un velero de madera del Nilo", "Una flor del desierto"], hint: "Puedes verlas en el Puerto de las Falucas.", explain: "Una faluca es un velero de madera con una vela grande, que todavía navega hoy por el Nilo." }
    ]
  },

  // ── Oasis 2: Mercado de Camellos ──
  'p2-desert-singing-dunes': {
    title: "Las dunas que cantan",
    topicName: "El sonido",
    blurb: "¡Algunas dunas de arena zumban y retumban! Descubre cómo se produce el sonido.",
    reading: [
      { title: "Dunas que zumban", text: "En unos pocos desiertos del mundo, las grandes dunas de arena pueden hacer un zumbido grave o un retumbo, como una nota grave de violonchelo o un avión a lo lejos." },
      { title: "Arena que se desliza", text: "El sonido aparece cuando la arena se desliza por la ladera empinada de una duna. Millones de granos se rozan y tiemblan, o vibran, todos a la vez." },
      { title: "Las vibraciones hacen sonido", text: "Todos los sonidos se producen porque algo vibra. Las vibraciones viajan por el aire hasta tus oídos." },
      { title: "Agudos y graves", text: "Las vibraciones rápidas hacen notas agudas, y las lentas, notas graves. Una regla corta suena más aguda que una larga." }
    ],
    sim: {
      predict: {
        q: "Dejas menos regla asomando por el borde de la mesa y la haces vibrar. ¿La nota será más aguda o más grave?",
        choices: ["Más aguda", "Más grave", "Igual"],
        explain: "Un trozo de regla más corto vibra más rápido, y las vibraciones más rápidas hacen una nota más aguda."
      }
    },
    quiz: [
      { q: "¿Qué produce todos los sonidos?", choices: ["Los colores", "Cosas que vibran", "El calor"], hint: "Piensa en una regla que vibra.", explain: "Todos los sonidos se producen porque algo vibra." },
      { q: "¿Cuándo suenan las dunas que cantan?", choices: ["Cuando la arena se desliza por la ladera empinada", "Cuando llueve", "Cuando los camellos les cantan"], hint: "Los granos se rozan.", explain: "El sonido aparece cuando la arena se desliza por la ladera empinada de la duna y los granos vibran juntos." },
      { q: "Haces vibrar una regla corta y una larga. ¿Cuál da la nota más aguda?", choices: ["La regla larga", "La regla corta"], hint: "Lo más corto vibra más rápido.", explain: "La regla corta vibra más rápido, así que su nota es más aguda." },
      { q: "Haces vibrar la regla con mucha más fuerza. ¿Qué cambia?", choices: ["Se vuelve azul", "Suena más grave", "Suena más fuerte"], hint: "Vibraciones más grandes.", explain: "Con más fuerza, las vibraciones son más grandes, así que el sonido es más fuerte." },
      { q: "¿Cómo llega a tus oídos el sonido de la duna?", choices: ["Las vibraciones viajan por el aire", "Lo llevan los pájaros", "Solo viaja por la arena"], hint: "¿Qué hay entre tú y la duna?", explain: "Las vibraciones viajan por el aire hasta tus oídos." }
    ]
  },
  'p2-desert-compass': {
    title: "Encontrar el norte en el desierto",
    topicName: "Los imanes",
    blurb: "¡Todas las dunas parecen iguales! Prueba qué atrae un imán y cómo una brújula encuentra el norte.",
    reading: [
      { title: "Sin caminos ni señales", text: "En pleno desierto, todas las dunas se parecen, y el viento las mueve poco a poco. Los viajeros necesitan una forma de saber hacia dónde van." },
      { title: "Los imanes atraen", text: "Un imán atrae las cosas de hierro y de acero, como los clavos y los clips. No atrae la madera, el plástico ni el aluminio." },
      { title: "La Tierra es un imán", text: "La Tierra es como un imán gigante, pero débil. La aguja de una brújula es un imán diminuto, así que gira para señalar el norte y el sur." },
      { title: "El Sol y las estrellas", text: "Mucho antes de las brújulas, los viajeros del desierto se guiaban por el Sol de día y por las estrellas de noche. Hoy muchos usan también una brújula y el GPS." }
    ],
    sim: {
      predict: {
        q: "¿El imán atraerá la lata de aluminio?",
        choices: ["Sí", "No"],
        explain: "El aluminio es un metal, pero no es magnético, así que el imán no atrae la lata. Lo que sí atrae es el hierro y el acero."
      }
    },
    quiz: [
      { q: "¿Cuál de estas cosas atrae un imán?", choices: ["Un bloque de madera", "Una goma elástica", "Un clavo de hierro"], hint: "Es de hierro.", explain: "Los imanes atraen las cosas de hierro y de acero, como un clavo de hierro." },
      { q: "¿Por qué la aguja de una brújula señala el norte?", choices: ["Es un imán diminuto, y la Tierra es como un imán gigante", "El viento la empuja", "Está pintada de rojo"], hint: "Piensa en la Tierra.", explain: "La aguja es un imán diminuto, y el magnetismo de la Tierra la hace girar para señalar el norte y el sur." },
      { q: "¿Un imán atrae una lata de aluminio?", choices: ["Sí", "No"], hint: "No todos los metales son magnéticos.", explain: "No. El aluminio no es magnético." },
      { q: "¿Por qué es fácil perderse entre las dunas?", choices: ["Hay demasiadas señales", "Las dunas se parecen y el viento las mueve", "La arena es morada"], hint: "Todas las dunas parecen iguales.", explain: "Las dunas se parecen y se mueven poco a poco con el viento, así que hay pocos puntos de referencia." },
      { q: "¿Qué usaban los viajeros del desierto para orientarse antes de las brújulas?", choices: ["Teléfonos", "Señales de tráfico", "El Sol y las estrellas"], hint: "Mira al cielo.", explain: "Se guiaban por el Sol de día y por las estrellas de noche." }
    ]
  },

  // ── Oasis 3: Puerto de las Falucas ──
  'p3-desert-moving-blocks': {
    title: "Mover bloques gigantes",
    topicName: "El rozamiento",
    blurb: "¿Cómo arrastraban los trabajadores piedras enormes por la arena? Prueba el rozamiento en una rampa.",
    reading: [
      { title: "Piedras pesadas", text: "Cada bloque de la Gran Pirámide pesaba, de media, más o menos lo que dos coches. Los trabajadores no tenían camiones ni grúas. Entonces, ¿cómo los movían?" },
      { title: "El rozamiento", text: "Cuando una cosa se desliza o rueda sobre otra, una fuerza llamada rozamiento empuja en contra y la frena. Las superficies ásperas y sueltas, como la arena seca, tienen mucho rozamiento. El hielo liso tiene muy poco." },
      { title: "Trineos y arena mojada", text: "Los trabajadores arrastraban los bloques sobre trineos de madera. Una antigua pintura egipcia muestra a un hombre echando agua en la arena delante de un trineo. Unos científicos lo probaron: ¡con la cantidad justa de agua, hace falta solo más o menos la mitad de fuerza para tirar!" },
      { title: "Rampas", text: "Seguramente los trabajadores también construyeron rampas largas de adobe y cascotes, para poder arrastrar los bloques más arriba a medida que crecía la pirámide." }
    ],
    sim: {
      predict: {
        q: "El cochecito baja por la rampa y sigue por arena, madera o hielo. ¿En cuál llegará más lejos?",
        choices: ["Arena", "Madera", "Hielo"],
        explain: "El hielo es lo más liso, con el menor rozamiento, así que el cochecito rueda más lejos sobre él. La arena tiene el mayor rozamiento, así que es donde antes se para."
      }
    },
    quiz: [
      { q: "¿Qué es el rozamiento?", choices: ["Una fuerza que frena las cosas que se deslizan o ruedan unas sobre otras", "Un tipo de arena", "Un imán"], hint: "Empuja en contra.", explain: "El rozamiento es una fuerza que empuja en contra cuando las cosas se deslizan o ruedan unas sobre otras." },
      { q: "¿Qué superficie tiene menos rozamiento?", choices: ["Arena seca", "Alfombra", "Hielo"], hint: "Es muy resbaladizo.", explain: "El hielo es liso y resbaladizo, así que tiene el menor rozamiento." },
      { q: "¿Por qué los trabajadores echaban agua en la arena delante de un trineo?", choices: ["Para refrescar a los camellos", "La cantidad justa de agua hacía más fácil tirar de él", "Para lavar las piedras"], hint: "La arena mojada es más firme.", explain: "La cantidad justa de agua hace que la arena sea más firme, así que el trineo se desliza con más facilidad." },
      { q: "Con la cantidad justa de agua, ¿cuánta fuerza necesitaron los científicos para arrastrar un trineo por la arena?", choices: ["Más o menos la mitad", "El doble", "Exactamente la misma"], hint: "Tirar se volvió mucho más fácil.", explain: "Sus pruebas mostraron que la arena mojada puede reducir a la mitad la fuerza necesaria para arrastrar un trineo." },
      { q: "¿Qué construyeron seguramente los trabajadores para subir los bloques por la pirámide?", choices: ["Ascensores", "Rampas largas", "Helicópteros"], hint: "Una cuesta de adobe y cascotes.", explain: "Seguramente los trabajadores construyeron rampas largas para arrastrar los bloques más arriba." }
    ]
  },
  'p3-desert-night-lanterns': {
    title: "Faroles para el mercado nocturno",
    topicName: "Circuitos eléctricos",
    blurb: "Enciende los faroles del puerto: ¿qué cosas dejan pasar la electricidad?",
    reading: [
      { title: "Luces de noche", text: "Cuando se pone el Sol, el mercado nocturno del Puerto de las Falucas necesita luz. Hoy muchos faroles funcionan con baterías que se cargan con la luz del sol." },
      { title: "Un camino cerrado para la electricidad", text: "La electricidad solo circula por un camino cerrado llamado circuito: desde la batería, por los cables y la bombilla, y de vuelta a la batería." },
      { title: "Conductores y aislantes", text: "Los metales, como el cobre y el aluminio, dejan pasar la electricidad: son conductores. La madera, el plástico y la goma la detienen: son aislantes." },
      { title: "De la luz del sol a la electricidad", text: "Un panel solar convierte la luz del sol en electricidad. En el desierto soleado, un panel solar pequeño puede cargar la batería de un farol durante todo el día, y así está listo para la noche." }
    ],
    sim: {
      predict: {
        q: "Cierras el hueco con un palito de madera. ¿Se encenderá la bombilla?",
        choices: ["Sí", "No"],
        explain: "La madera es un aislante: la electricidad no puede pasar por ella, así que el circuito no está cerrado y la bombilla sigue apagada."
      }
    },
    quiz: [
      { q: "¿Qué es un circuito?", choices: ["Un camino del desierto", "Un camino cerrado por el que circula la electricidad", "Un tipo de batería"], hint: "Tiene que dar toda la vuelta.", explain: "Un circuito es un camino cerrado: batería, cables, bombilla y de vuelta a la batería." },
      { q: "¿Cuál de estos es un conductor?", choices: ["Una goma elástica", "Una pajita de plástico", "Papel de aluminio"], hint: "Busca un metal.", explain: "El papel de aluminio es un metal, así que conduce la electricidad." },
      { q: "¿Por qué los cables eléctricos están cubiertos de plástico?", choices: ["El plástico es un aislante, así que mantiene la electricidad dentro sin peligro", "Para que pesen más", "El plástico es el mejor conductor"], hint: "El plástico detiene la electricidad.", explain: "El plástico es un aislante, así que una capa de plástico mantiene la electricidad dentro del cable y nos protege." },
      { q: "¿Qué hace un panel solar?", choices: ["Da sombra", "Convierte la luz del sol en electricidad", "Guarda agua"], hint: "Solar quiere decir «del Sol».", explain: "Un panel solar convierte la luz del sol en electricidad." },
      { q: "Hay un hueco en el circuito. ¿Qué le pasa a la bombilla?", choices: ["Sigue apagada", "Brilla más", "Se vuelve verde"], hint: "El camino está cortado.", explain: "Con un hueco, el camino no está cerrado, así que no circula electricidad y la bombilla sigue apagada." }
    ]
  },

  // ── Oasis 4: Plaza del Obelisco ──
  'p4-desert-shadoof': {
    title: "El shaduf: una palanca para el agua",
    topicName: "Las palancas",
    blurb: "Saca agua del Nilo con un palo, un poste y un peso pesado.",
    reading: [
      { title: "Subir agua", text: "El agua pesa mucho: un cubo grande lleno puede pesar tanto como un niño pequeño. Los agricultores egipcios tenían que subir agua del río a sus campos muchas veces al día." },
      { title: "El shaduf", text: "Un shaduf es un palo largo apoyado en equilibrio sobre un poste. Del extremo largo cuelga un cubo, y en el extremo corto hay un bulto pesado de barro o de piedra. El poste es el pivote, o fulcro." },
      { title: "Un peso que ayuda", text: "El agricultor baja el cubo hasta el río. Luego el contrapeso hace casi todo el trabajo, y el cubo lleno sube balanceándose." },
      { title: "La regla de la palanca", text: "Una palanca está en equilibrio cuando peso × distancia al pivote da lo mismo en los dos lados. Un peso pequeño lejos del pivote puede equilibrar un peso grande cerca de él." }
    ],
    sim: {
      predict: {
        q: "Un peso de 3 kg está a 2 pasos del pivote, a la izquierda. ¿Dónde hay que poner un peso de 2 kg, a la derecha, para equilibrarlo?",
        choices: ["A 1 paso del pivote", "A 3 pasos del pivote", "A 6 pasos del pivote"],
        explain: "3 kg × 2 pasos = 6 a la izquierda, y 2 kg × 3 pasos = 6 a la derecha. Los dos lados coinciden, así que queda en equilibrio."
      }
    },
    quiz: [
      { q: "¿Cuál es el pivote de un shaduf?", choices: ["El poste sobre el que se equilibra el palo", "El cubo", "El río"], hint: "El palo gira alrededor de él.", explain: "El poste es el pivote: el punto alrededor del cual gira el palo." },
      { q: "¿Qué hace el contrapeso del shaduf?", choices: ["Mantiene caliente el agua", "Ayuda a subir el cubo lleno", "Espanta a los pájaros"], hint: "Está en el otro extremo.", explain: "El contrapeso pesado del extremo corto ayuda a subir el cubo lleno." },
      { q: "Un peso de 4 kg está a 1 paso del pivote. ¿A qué distancia hay que poner un peso de 2 kg para equilibrarlo?", choices: ["A 1 paso", "A 4 pasos", "A 2 pasos"], hint: "4 × 1 = 2 × ?", explain: "4 × 1 = 4, y 2 × 2 = 4. Así que el peso de 2 kg va a 2 pasos." },
      { q: "¿Cuál de estas cosas también es una palanca?", choices: ["Una pelota", "Una cuerda", "Un balancín (o subibaja)"], hint: "Tiene un pivote en el centro.", explain: "Un balancín es una palanca: una barra que gira alrededor de un pivote." },
      { q: "¿Por qué usaban un shaduf los agricultores?", choices: ["Hacía mucho más fácil subir el agua", "Limpiaba el agua", "Pescaba peces"], hint: "El contrapeso ayuda.", explain: "La palanca y su contrapeso hacían mucho más fácil subir cubos pesados de agua." }
    ]
  },
  'p4-desert-hot-cold': {
    title: "Días calurosos, noches frías",
    topicName: "Los estados de la materia",
    blurb: "¿Por qué el desierto se congela de noche? Calienta y enfría agua para descubrirlo.",
    reading: [
      { title: "Un cambio enorme", text: "En el Sahara, un día de verano puede pasar de 40 °C. Pero el desierto se enfría rápido por la noche, y en las noches de invierno hasta puede bajar de 0 °C." },
      { title: "¿Por qué tanto frío de noche?", text: "El aire del desierto es muy seco y hay pocas nubes. Las nubes y el vapor de agua funcionan como una manta. Sin ellos, el calor del suelo se escapa rápido hacia el cielo." },
      { title: "Hielo, agua, vapor", text: "El agua se congela y se vuelve hielo a 0 °C, y hierve a 100 °C al nivel del mar. Entre medias, es un líquido. Pasar de sólido a líquido o a gas se llama cambio de estado." },
      { title: "Enfriar evaporando", text: "Cuando el agua se evapora, se lleva calor con ella. Una vasija de barro mojada, o una vasija dentro de otra más grande con arena mojada entre las dos, mantiene frescos la comida y el agua en el desierto." }
    ],
    sim: {
      predict: {
        q: "Enfrías agua empezando a 20 °C. ¿A qué temperatura empezará a congelarse?",
        choices: ["0 °C", "10 °C", "−20 °C"],
        explain: "El agua se congela a 0 °C. Por eso una botella de agua que se queda fuera en una noche helada del desierto puede convertirse en hielo."
      }
    },
    quiz: [
      { q: "¿Por qué las noches del desierto son tan frías?", choices: ["Por la noche el Sol está más cerca", "El aire seco y el cielo despejado dejan escapar el calor rápido", "La arena fabrica hielo"], hint: "No hay una manta de nubes.", explain: "El aire seco y el cielo despejado no pueden retener el calor, así que se escapa rápido hacia el cielo." },
      { q: "¿A qué temperatura se congela el agua?", choices: ["50 °C", "100 °C", "0 °C"], hint: "El mismo número que el cero de un termómetro.", explain: "El agua se congela y se vuelve hielo a 0 °C." },
      { q: "Una botella de agua se queda fuera en una noche de invierno del desierto, a −3 °C. ¿Qué puede pasar?", choices: ["El agua puede congelarse", "Hierve", "Se convierte en arena"], hint: "−3 °C está bajo cero.", explain: "−3 °C está por debajo de 0 °C, así que el agua puede congelarse." },
      { q: "¿Por qué una vasija de barro mojada mantiene el agua fresca?", choices: ["El barro es mágico", "El agua que se evapora se lleva el calor", "La vasija está pintada de blanco"], hint: "Piensa en lo que le pasa al agua de fuera.", explain: "Cuando el agua se evapora de la vasija mojada, se lleva calor, y lo de dentro se enfría." },
      { q: "El agua hierve a 100 °C al nivel del mar. ¿En qué se convierte?", choices: ["En hielo", "En arena", "En vapor de agua"], hint: "Se vuelve un gas.", explain: "El agua que hierve se convierte en vapor de agua, un gas." }
    ]
  },

  // ── Oasis 5: Campo de Globos ──
  'p5-desert-mirages': {
    title: "Espejismos: trucos de la luz",
    topicName: "Reflexión y refracción",
    blurb: "¡Un lago brillante que no está ahí! Haz rebotar la luz en un espejo y descubre cómo funcionan los espejismos.",
    reading: [
      { title: "Agua que no está", text: "En un día caluroso, los viajeros del desierto a veces ven algo que parece un lago brillante a lo lejos. Cuando se acercan, ¡ha desaparecido! Es un espejismo." },
      { title: "La luz se dobla", text: "La luz viaja en línea recta por un aire que es igual en todas partes. Pero cuando pasa entre aire más fresco y aire más caliente, se dobla. Que la luz se doble se llama refracción." },
      { title: "El cielo en el suelo", text: "El aire justo encima de la arena caliente está mucho más caliente que el aire de más arriba. La luz del cielo se dobla hacia arriba al pasar rozando ese aire caliente, así que ves una imagen del cielo azul en el suelo. Parece agua que refleja el cielo." },
      { title: "Espejos", text: "Un espejo hace rebotar la luz: el ángulo con el que llega la luz es igual al ángulo con el que rebota. Un espejismo se comporta un poco como un espejo tumbado sobre la arena." }
    ],
    sim: {
      predict: {
        q: "Un rayo de luz llega al espejo a 30° de la normal. ¿A qué ángulo de la normal rebotará?",
        choices: ["30°", "60°", "90°"],
        explain: "El ángulo de llegada es igual al de salida, así que rebota a 30°, al otro lado de la normal."
      }
    },
    quiz: [
      { q: "¿Qué es un espejismo?", choices: ["Un animal del desierto", "Un truco de la luz que puede parecer agua", "Un tipo de tormenta de arena"], hint: "El lago desaparece al acercarte.", explain: "Un espejismo es un truco de la luz: la luz doblada hace que el cielo aparezca en el suelo, como si fuera agua." },
      { q: "¿Qué le pasa a la luz que pasa entre aire fresco y aire muy caliente?", choices: ["Se dobla", "Se para", "Se vuelve verde"], hint: "Esto se llama refracción.", explain: "La luz se dobla cuando pasa entre aire de distintas temperaturas." },
      { q: "¿Qué ves en realidad en un espejismo del desierto?", choices: ["Agua de verdad", "Arena derretida", "Una imagen del cielo, doblada por el aire caliente"], hint: "Es azul, como el cielo.", explain: "El aire caliente dobla la luz del cielo hasta tus ojos, así que ves el cielo en el suelo." },
      { q: "Un rayo llega a un espejo a 40° de la normal. ¿A qué ángulo rebota?", choices: ["20°", "40°", "80°"], hint: "Ángulo de llegada igual a ángulo de salida.", explain: "Rebota a 40°, el mismo ángulo con el que llegó." },
      { q: "¿Se puede fotografiar un espejismo?", choices: ["Sí, porque la luz doblada llega de verdad a la cámara", "No, solo está en tu cabeza"], hint: "¿La luz es real?", explain: "¡Sí! Un espejismo es luz real, solo que doblada, así que una cámara puede fotografiarlo." }
    ]
  },
  'p5-desert-hot-air-balloons': {
    title: "¿Por qué suben los globos aerostáticos?",
    topicName: "Densidad y flotación",
    blurb: "Al amanecer, los globos flotan sobre el Nilo. Prueba qué flota y luego descubre por qué sube el aire caliente.",
    reading: [
      { title: "Globos sobre el desierto", text: "Al amanecer, cerca de Lúxor, los globos aerostáticos flotan sobre los templos y el Nilo. ¿Cómo suben hasta el cielo?" },
      { title: "Flotar en el aire", text: "Las cosas flotan en el agua cuando son menos densas que el agua: tienen menos masa en el mismo espacio. ¡La misma idea funciona en el aire!" },
      { title: "El aire caliente es más ligero", text: "Cuando el aire se calienta, sus partículas se mueven más rápido y se separan. Así que un globo lleno de aire caliente es menos denso que el aire más fresco que lo rodea, y sube flotando." },
      { title: "El primer vuelo", text: "En 1783, en Francia, un globo aerostático hecho por los hermanos Montgolfier llevó por primera vez a personas al cielo." }
    ],
    sim: {
      predict: {
        q: "¿Cuál flotará en el tanque de agua: el cubito de hielo o la canica de vidrio?",
        choices: ["El cubito de hielo", "La canica de vidrio"],
        explain: "El hielo es un poco menos denso que el agua, así que flota. El vidrio es mucho más denso que el agua, así que la canica se hunde."
      }
    },
    quiz: [
      { q: "¿Por qué sube un globo aerostático?", choices: ["Lo suben los pájaros", "El aire caliente pesa más", "El aire caliente de dentro es menos denso que el aire más fresco de fuera"], hint: "Piensa en la densidad.", explain: "El aire caliente se expande y se vuelve menos denso que el aire más fresco que lo rodea, así que el globo sube flotando." },
      { q: "¿Qué le pasa al aire cuando se calienta?", choices: ["Sus partículas se separan, así que se vuelve menos denso", "Se convierte en agua", "Pesa más"], hint: "Las partículas se mueven más rápido.", explain: "Las partículas calientes se mueven más rápido y se separan, y el aire se vuelve menos denso." },
      { q: "Un cubito de hielo flota en el agua. ¿Qué te dice eso?", choices: ["El hielo es magnético", "El hielo es menos denso que el agua", "El hielo pesa más que todo el tanque"], hint: "Las cosas menos densas que el agua flotan.", explain: "Que flote muestra que el hielo es menos denso que el agua líquida." },
      { q: "¿Cuándo suelen volar los globos en el desierto?", choices: ["A mediodía, en plena tormenta de arena", "Temprano por la mañana, cuando el aire está fresco y tranquilo", "Nunca"], hint: "Piensa en un aire fresco y tranquilo.", explain: "Los globos vuelan temprano por la mañana, cuando el aire está fresco y tranquilo y el globo caliente sube bien." },
      { q: "¿De quién era el globo que llevó a las primeras personas al cielo, en 1783?", choices: ["De los hermanos Montgolfier", "De Howard Carter", "De Ibn Battuta"], hint: "Dos hermanos de Francia.", explain: "En 1783, un globo hecho por los hermanos Montgolfier llevó a las primeras personas al cielo." }
    ]
  },

  // ── Oasis 6: Biblioteca de Papiros ──
  'p6-desert-sandstorms': {
    title: "Tormentas de arena y polvo volador",
    topicName: "La gravedad y la resistencia del aire",
    blurb: "¿Por qué el polvo vuela durante días y la arena cae rápido? Deja caer cosas con aire y sin aire.",
    reading: [
      { title: "Muros de arena", text: "En una tormenta de arena, vientos fuertes levantan arena y polvo muy alto. El cielo se vuelve naranja y cuesta ver. Los camellos pueden cerrar los orificios de la nariz, y sus pestañas largas ayudan a que no les entre arena en los ojos." },
      { title: "La resistencia del aire", text: "El aire empuja en contra de las cosas que caen. Las cosas ligeras con mucha superficie para su peso, como las plumas o las motas diminutas de polvo, se frenan mucho. Una pelota pesada y compacta cae rápido." },
      { title: "Granos grandes, granos diminutos", text: "Los granos de arena pesados vuelven a caer enseguida y van rebotando cerca del suelo. El polvo muy fino cae tan despacio que el viento puede llevarlo durante días." },
      { title: "El polvo del desierto alimenta una selva", text: "Cada año, el viento lleva millones de toneladas de polvo del Sahara a través del océano Atlántico. Parte de él cae sobre la selva amazónica y le aporta nutrientes que ayudan a crecer a las plantas." }
    ],
    sim: {
      predict: {
        q: "Dejas caer una pelota y una pluma a la vez, con aire en el tubo. ¿Cuál llega primero al suelo?",
        choices: ["La pelota", "La pluma", "Las dos a la vez"],
        explain: "La resistencia del aire frena mucho más a la pluma, ligera y esponjosa, que a la pelota, así que la pelota llega primero. ¡Quita el aire y caen juntas!"
      }
    },
    quiz: [
      { q: "¿Qué frena una pluma que cae?", choices: ["Los imanes", "La luz del sol", "La resistencia del aire"], hint: "El aire empuja en contra.", explain: "La resistencia del aire, el empuje del aire, frena la pluma." },
      { q: "¿Por qué el polvo fino puede viajar tan lejos con el viento?", choices: ["Cae muy despacio, así que el viento lo sigue llevando", "Es magnético", "Pesa más que la arena"], hint: "Piensa en la pluma.", explain: "Las motas diminutas de polvo caen muy despacio, así que el viento puede llevarlas durante días y a miles de kilómetros." },
      { q: "En el vacío, sin nada de aire, se dejan caer juntas una pelota y una pluma. ¿Qué pasa?", choices: ["La pelota llega primero", "Llegan juntas", "La pluma sube flotando"], hint: "Sin aire no hay resistencia del aire.", explain: "Sin resistencia del aire, la gravedad las hace caer juntas y llegan al mismo tiempo." },
      { q: "¿Cómo evitan los camellos que les entre arena en la nariz?", choices: ["Llevan mascarilla", "Pueden cerrar los orificios de la nariz", "Estornudan todo el día"], hint: "Un truco muy listo de su cuerpo.", explain: "Los camellos pueden cerrar los orificios de la nariz para que no les entre arena." },
      { q: "¿Dónde cae parte del polvo del Sahara, al otro lado del océano?", choices: ["En la selva amazónica", "En la Luna", "Solo en la Antártida"], hint: "Una selva de Sudamérica.", explain: "Los vientos llevan el polvo del Sahara a través del Atlántico, y parte de él alimenta la selva amazónica." }
    ]
  },
  'p6-desert-caravan-speed': {
    title: "¿A qué velocidad va una caravana?",
    topicName: "Velocidad, distancia y tiempo",
    blurb: "Haz carreras de carritos y luego planea el viaje de una caravana con distancia = velocidad × tiempo.",
    reading: [
      { title: "La velocidad", text: "La velocidad te dice cuánto recorre algo en un tiempo determinado. Una caravana de camellos cargados camina a unos 4 kilómetros por hora, más o menos tan rápido como caminas tú." },
      { title: "Distancia = velocidad × tiempo", text: "Si una caravana camina a 4 km/h durante 8 horas, recorre 4 × 8 = 32 km. Es un buen día de viaje." },
      { title: "Tiempo = distancia ÷ velocidad", text: "Para cruzar 600 km de desierto a unos 30 km por día, una caravana necesita 600 ÷ 30 = 20 días. Los guías planean dónde están los pozos por el camino." },
      { title: "Camellos de carreras", text: "¡Los camellos pueden correr mucho más rápido de lo que caminan! Un camello de carreras puede mantener unos 40 km/h, y esprintar aún más rápido durante un rato." }
    ],
    sim: {
      predict: {
        q: "En el laboratorio, el carrito A va a 2 m/s y el carrito B a 4 m/s. Corren durante 5 segundos. ¿Cuánto recorre el carrito B?",
        choices: ["10 m", "20 m", "9 m"],
        explain: "Distancia = velocidad × tiempo = 4 m/s × 5 s = 20 m. El carrito A solo recorre 2 × 5 = 10 m."
      }
    },
    quiz: [
      { q: "Una caravana camina a 4 km/h durante 6 horas. ¿Cuánto recorre?", choices: ["10 km", "64 km", "24 km"], hint: "Distancia = velocidad × tiempo.", explain: "4 × 6 = 24, así que recorre 24 km." },
      { q: "Un camello camina 30 km en 6 horas. ¿Cuál es su velocidad media?", choices: ["5 km/h", "36 km/h", "180 km/h"], hint: "Velocidad = distancia ÷ tiempo.", explain: "30 ÷ 6 = 5, así que su velocidad media es de 5 km/h." },
      { q: "Una caravana recorre 35 km al día. ¿Cuántos días necesita para recorrer 280 km?", choices: ["7", "8", "9"], hint: "Tiempo = distancia ÷ velocidad.", explain: "280 ÷ 35 = 8, así que necesita 8 días." },
      { q: "¿Qué es más rápido: un camello de carreras a 40 km/h o una persona que camina a 5 km/h?", choices: ["La persona", "El camello de carreras"], hint: "Compara los números.", explain: "40 km/h es ocho veces más rápido que 5 km/h." },
      { q: "Dos camellos caminan durante el mismo tiempo. El camello A recorre 20 km y el camello B, 30 km. ¿Cuál fue más rápido?", choices: ["El camello A", "El camello B", "Fueron igual de rápidos"], hint: "Mismo tiempo, más distancia.", explain: "En el mismo tiempo, el camello B llegó más lejos, así que fue más rápido." }
    ]
  },

  // ── Oasis 7: Campamento Estrellado ──
  'p7-desert-eratosthenes': {
    title: "Eratóstenes mide la Tierra",
    topicName: "Medir la Tierra con sombras",
    blurb: "Usa sombras, un poco de geometría y dos ciudades egipcias para medir la Tierra entera.",
    reading: [
      { title: "Una idea genial", text: "Hace unos 2240 años, Eratóstenes, el director de la biblioteca de Alejandría, oyó que en Siena (la actual Asuán), al mediodía del día más largo del año, los postes verticales casi no daban sombra. El Sol estaba casi justo encima." },
      { title: "Sombras en Alejandría", text: "Ese mismo día, al mediodía, en Alejandría, mucho más al norte, un palo vertical sí daba sombra. La luz del sol llegaba inclinada unos 7,2° respecto a la vertical, que es más o menos 1/50 de una vuelta completa (360°)." },
      { title: "Una Tierra curva", text: "El Sol está tan lejos que sus rayos llegan casi paralelos. Así que, si las sombras eran distintas, la superficie de la Tierra tenía que ser curva. De Siena a Alejandría había unos 5000 estadios, así que la vuelta entera medía unos 50 × 5000 = 250 000 estadios." },
      { title: "Muy cerca", text: "Nadie sabe exactamente cuánto medía su estadio, pero su resultado se acercó muchísimo a la distancia real alrededor de la Tierra: unos 40 000 km." }
    ],
    sim: {
      predict: {
        q: "Alejas mucho la linterna del juguete. ¿Qué le pasa a la sombra en la pared?",
        choices: ["Se encoge hasta parecerse al tamaño del propio juguete", "Se hace enorme", "Desaparece"],
        explain: "Desde lejos, los rayos de luz llegan al juguete casi paralelos, así que la sombra se parece al tamaño del propio juguete. El Sol está tan lejos que sus rayos son casi paralelos: Eratóstenes contaba con eso."
      }
    },
    quiz: [
      { q: "¿Por qué los postes verticales de Siena casi no daban sombra al mediodía del día más largo?", choices: ["Estaba nublado", "El Sol estaba casi justo encima", "Los postes eran demasiado finos"], hint: "¿Dónde estaba el Sol en el cielo?", explain: "El Sol estaba casi justo encima, así que casi no había sombra." },
      { q: "¿Qué fracción de una vuelta completa (360°) es, más o menos, 7,2°?", choices: ["1/50", "1/10", "1/2"], hint: "360 ÷ 7,2 = ?", explain: "360 ÷ 7,2 = 50, así que 7,2° es 1/50 de una vuelta." },
      { q: "De Siena a Alejandría hay 5000 estadios, y eso es 1/50 de la vuelta a la Tierra. ¿Cuánto mide la vuelta entera?", choices: ["5050 estadios", "100 000 estadios", "250 000 estadios"], hint: "50 × 5000.", explain: "50 × 5000 = 250 000 estadios." },
      { q: "¿Por qué las sombras eran distintas en las dos ciudades el mismo día?", choices: ["El Sol estaba más cerca de Alejandría", "Alejandría tenía palos más altos", "La superficie de la Tierra es curva"], hint: "Los rayos del Sol llegan casi paralelos.", explain: "La luz del sol llega en paralelo a una Tierra curva, así que en cada lugar entra con un ángulo distinto y las sombras cambian." },
      { q: "¿Más o menos cuánto mide la vuelta a la Tierra?", choices: ["Unos 400 km", "Unos 40 000 km", "Unos 4 millones de km"], hint: "Decenas de miles de kilómetros.", explain: "La vuelta a la Tierra mide unos 40 000 km, y el resultado de Eratóstenes se acercó muchísimo." }
    ]
  },
  'p7-desert-star-calendar': {
    title: "El calendario del cielo del desierto",
    topicName: "Órbitas y calendario",
    blurb: "Lanza una luna a su órbita y descubre cómo la órbita de la Tierra y una estrella brillante le dieron a Egipto su calendario.",
    reading: [
      { title: "Un año es una órbita", text: "La gravedad del Sol hace que la Tierra siga viajando a su alrededor en una órbita. Una vuelta completa tarda unos 365¼ días: eso es un año." },
      { title: "El calendario de Egipto", text: "Los antiguos egipcios hicieron un calendario de 365 días: 12 meses de 30 días, más 5 días extra al final del año para fiestas." },
      { title: "La estrella de la crecida", text: "Cada verano, la brillante estrella Sirio volvía a aparecer en el cielo del amanecer justo antes de salir el Sol, después de unos 70 días escondida en el resplandor del Sol. Eso pasaba más o menos cuando el Nilo empezaba a crecer." },
      { title: "El cuarto de día que falta", text: "El año real dura un cuarto de día más que 365 días, así que el calendario egipcio se iba desfasando poco a poco: un día cada cuatro años. Hoy añadimos un día bisiesto cada cuatro años para arreglarlo." }
    ],
    sim: {
      predict: {
        q: "Lanzas la luna de lado, demasiado despacio. ¿Qué pasará?",
        choices: ["Cae hacia el planeta", "Se escapa al espacio", "Se queda quieta en el cielo"],
        explain: "Si va demasiado despacio, la gravedad la tira hacia abajo antes de que pueda dar la vuelta: cae hacia el planeta. Con la velocidad de lado justa, sigue cayendo alrededor una y otra vez: una órbita, como la de la Tierra alrededor del Sol."
      }
    },
    quiz: [
      { q: "¿Cuánto tarda la Tierra en dar una vuelta alrededor del Sol?", choices: ["Unas 24 horas", "Unos 30 días", "Unos 365¼ días"], hint: "Un año.", explain: "Una órbita alrededor del Sol tarda unos 365¼ días: un año." },
      { q: "¿Cuántos días tenía el año del calendario egipcio?", choices: ["365", "360", "400"], hint: "12 meses de 30 días, más 5.", explain: "12 × 30 = 360, y con los 5 días de fiesta son 365." },
      { q: "¿Qué les anunciaba a los agricultores egipcios la salida de Sirio al amanecer?", choices: ["Que llegaba la nieve del invierno", "Que llegaba la crecida del Nilo", "Que era hora de dormir"], hint: "Pasaba cada verano.", explain: "Sirio volvía a aparecer al amanecer más o menos cuando el Nilo empezaba a crecer, así que era una señal de la crecida." },
      { q: "Un calendario tiene 365 días, pero el año real dura 365¼ días. ¿Cuántos días se desfasa en 8 años?", choices: ["1", "2", "8"], hint: "Un cuarto de día cada año.", explain: "8 × ¼ = 2, así que se desfasa 2 días en 8 años." },
      { q: "¿Qué hace que la Tierra siga viajando alrededor del Sol en vez de salir volando al espacio?", choices: ["El viento", "Los imanes", "La gravedad del Sol"], hint: "Acuérdate de la luna que lanzaste.", explain: "La gravedad del Sol va curvando el camino de la Tierra, y su velocidad de lado la hace dar la vuelta: una órbita." }
    ]
  }
};
