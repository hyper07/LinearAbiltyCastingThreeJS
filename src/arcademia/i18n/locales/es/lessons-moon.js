/** Español — The Moon's lessons (overlay on content/moon.js; text only). */
export default {
  // ───────── Matemáticas de la Luna (Escuela Cúpula) ─────────
  // ── Base lunar 1: Cráter del Aterrizaje ──
  'm1-moon-crater-count': {
    title: "Contar cráteres", topicName: "Contar", blurb: "Cuenta los cráteres y las estrellas del Cráter del Aterrizaje, de uno en uno y de cinco en cinco.",
    reading: [
      { title: "Agujeros en el suelo", text: "La Luna está llena de agujeros redondos llamados cráteres. Señala cada cráter una vez y di un número. El último número que dices es cuántos hay." },
      { title: "De cinco en cinco", text: "La tripulación de la base lunar guarda las rocas lunares en bolsas de 5. Cuenta las bolsas: 5, 10, 15, 20. ¡Es mucho más rápido que contar de uno en uno!" },
      { title: "No cuentes dos veces", text: "¡Las estrellas son difíciles de contar! Empieza por un lado y ve avanzando, como cuando lees un libro. Así nunca cuentas una estrella dos veces y nunca te saltas ninguna." }
    ],
    quiz: [
      { q: "¿Cuántos cráteres ves? 🌑🌑🌑🌑🌑🌑🌑", choices: ["7", "6", "8"], hint: "Señala cada cráter una vez mientras cuentas.", explain: "1, 2, 3, 4, 5, 6, 7. Hay 7 cráteres." },
      { q: "Hay 4 bolsas con 5 rocas lunares en cada una. ¿Cuántas rocas lunares son?", choices: ["9", "20", "15"], hint: "Cuenta de cinco en cinco: 5, 10, …", explain: "5, 10, 15, 20. Cuatro bolsas de 5 son 20 rocas lunares." },
      { q: "Cuenta las estrellas: ⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐. ¿Cuántas hay?", choices: ["11", "10", "12"], hint: "Cuenta las 10 primeras y luego sigue contando.", explain: "10, y luego 11, 12. Hay 12 estrellas." },
      { q: "El róver cuenta cráteres: 16, 17, 18. ¿Qué número va después?", choices: ["17", "19", "20", "16"], hint: "¿Qué número va justo después del 18?", explain: "Después del 18 va el 19." },
      { q: "3 astronautas dejan 5 huellas cada uno. ¿Cuántas huellas son?", choices: ["15", "8", "35"], hint: "Cuenta de cinco en cinco, 3 veces.", explain: "5, 10, 15. Tres veces 5 son 15 huellas." }
    ]
  },
  'm1-moon-countdown': {
    title: "La cuenta atrás del cohete", topicName: "Restas hasta 10", blurb: "Cuenta hacia atrás hasta el despegue y descubre cuántos quedan.",
    reading: [
      { title: "¡Cuenta atrás para despegar!", text: "Antes de que un cohete despegue, todos cuentan juntos hacia atrás: 10, 9, 8, 7, 6, 5, 4, 3, 2, 1… ¡despegue!" },
      { title: "Quitar", text: "Restar es quitar. Si tienes 8 galletas lunares y quitas 3, quedan 5 galletas. Contar hacia atrás te ayuda a encontrar la respuesta." },
      { title: "Salta hacia atrás", text: "En la recta numérica, empieza en el primer número y da un salto hacia atrás por cada uno que quitas. Donde caes, esa es la respuesta." }
    ],
    quiz: [
      { q: "La cuenta atrás va así: 10, 9, 8, 7. ¿Qué número va después?", choices: ["8", "6", "5"], hint: "Cuenta hacia atrás: uno menos cada vez.", explain: "10, 9, 8, 7 y luego 6." },
      { q: "Hay 9 astronautas en la base lunar. 4 salen a explorar. ¿Cuántos se quedan dentro?", choices: ["5", "13", "4"], hint: "Empieza en el 9 y salta 4 hacia atrás.", explain: "9 − 4 = 5. Hay 5 astronautas dentro." },
      { q: "La Señorita Mochi tiene 7 pastelitos de arroz. Regala 2. ¿Cuántos le quedan?", choices: ["9", "4", "5"], hint: "Empieza en el 7 y salta 2 hacia atrás.", explain: "7 − 2 = 5. Le quedan 5 pastelitos de arroz." },
      { q: "Hay 6 róveres en el garaje. Los 6 se van. ¿Cuántos quedan?", choices: ["6", "0", "12", "1"], hint: "Se fueron todos.", explain: "6 − 6 = 0. No queda ningún róver." },
      { q: "Al cohete le quedan 10 segundos para despegar. Pasan 3 segundos. ¿Cuántos segundos quedan?", choices: ["6", "13", "7"], hint: "Empieza en el 10 y salta 3 hacia atrás.", explain: "10 − 3 = 7. Quedan 7 segundos." }
    ]
  },

  // ── Base lunar 2: Loma del Cohete ──
  'm2-moon-rock-tens': {
    title: "Rocas lunares de diez en diez", topicName: "Valor posicional", blurb: "Guarda rocas lunares en bolsas de diez y descubre qué significa cada cifra.",
    reading: [
      { title: "Bolsas de diez", text: "Los astronautas recogen rocas lunares para llevarlas a la Tierra. Vamos a guardar nuestras rocas en bolsas de 10. 3 bolsas llenas y 4 rocas sueltas son 34 rocas." },
      { title: "Decenas y unidades", text: "En 34, el 3 está en la casa de las decenas, así que vale 30. El 4 está en la casa de las unidades, así que vale 4." },
      { title: "Cambia las cifras de sitio", text: "43 y 34 tienen las mismas cifras, pero son números diferentes. 43 son 4 decenas y 3 unidades, ¡así que es más!" }
    ],
    quiz: [
      { q: "La tripulación llena 6 bolsas de 10 rocas lunares y sobran 2 rocas. ¿Cuántas rocas son?", choices: ["62", "26", "8"], hint: "6 decenas y 2 unidades.", explain: "6 decenas son 60, y 2 más son 62." },
      { q: "En 57, ¿qué significa el 5?", choices: ["5 unidades", "5 decenas", "5 centenas"], hint: "El 5 está en la casa de las decenas.", explain: "En 57, el 5 significa 5 decenas (50) y el 7 significa 7 unidades." },
      { q: "¿Qué número tiene 4 decenas y 9 unidades?", choices: ["94", "13", "49"], hint: "Primero las decenas y luego las unidades.", explain: "4 decenas y 9 unidades forman 49." },
      { q: "¿Qué es más: 71 cráteres o 17 cráteres?", choices: ["17", "71", "Son iguales"], hint: "Mira primero las decenas.", explain: "71 tiene 7 decenas y 17 solo tiene 1 decena. Así que 71 es más." },
      { q: "¿Cuántas decenas hay en 80?", choices: ["80", "0", "10", "8"], hint: "Cuenta de diez en diez: 10, 20, 30…", explain: "80 son 8 decenas y 0 unidades." }
    ]
  },
  'm2-moon-hops': {
    title: "Saltos lunares de 2 en 2, de 5 en 5 y de 10 en 10", topicName: "Contar de 2 en 2, de 5 en 5 y de 10 en 10", blurb: "Avanza por la Luna dando grandes saltos y cuenta de dos en dos, de cinco en cinco y de diez en diez.",
    reading: [
      { title: "Grandes saltos", text: "¡En la Luna te sientes tan ligero que puedes avanzar dando grandes saltos! Los astronautas iban dando brincos como canguros." },
      { title: "De dos en dos", text: "Las botas van por pares. Cuenta las botas de dos en dos: 2, 4, 6, 8, 10." },
      { title: "De cinco en cinco y de diez en diez", text: "Cuenta los dedos de los guantes espaciales de cinco en cinco: 5, 10, 15, 20. Y cuenta saltos gigantes de 10 pasos de diez en diez: ¡10, 20, 30, 40!" }
    ],
    quiz: [
      { q: "Cuenta de dos en dos: 2, 4, 6, 8, … ¿Qué número va después?", choices: ["9", "10", "12"], hint: "Suma 2 cada vez.", explain: "8 + 2 = 10." },
      { q: "Cada salto lunar avanza 10 pasos. Después de 4 saltos, ¿cuántos pasos son?", choices: ["14", "4", "40"], hint: "Cuenta de diez en diez 4 veces.", explain: "10, 20, 30, 40. Son 40 pasos." },
      { q: "5 astronautas tienen 2 botas cada uno. ¿Cuántas botas son?", choices: ["10", "7", "12"], hint: "Cuenta de dos en dos 5 veces.", explain: "2, 4, 6, 8, 10. Hay 10 botas." },
      { q: "Cuenta de cinco en cinco: 15, 20, 25, … ¿Qué número va después?", choices: ["26", "30", "35"], hint: "Suma 5.", explain: "25 + 5 = 30." },
      { q: "¿Qué lista cuenta de diez en diez?", choices: ["10, 11, 12, 13", "2, 4, 6, 8", "10, 20, 30, 40"], hint: "Cada número es 10 más que el anterior.", explain: "10, 20, 30, 40 sube de 10 en 10." }
    ]
  },

  // ── Base lunar 3: Huellas del Róver ──
  'm3-moon-phase-fractions': {
    title: "Fracciones de la Luna", topicName: "Fracciones", blurb: "Media luna, luna llena: descubre las fracciones en la forma cambiante de la Luna y reparte pasteles de luna de forma justa.",
    reading: [
      { title: "Partes de un todo", text: "Una fracción es una parte de un todo. Cuando vemos toda la cara brillante de la Luna, es luna llena. Cuando vemos iluminada solo la mitad, es media luna." },
      { title: "Arriba y abajo", text: "En 3/4, el número de abajo (4) dice cuántas partes iguales hay. El número de arriba (3) dice cuántas de esas partes tomamos." },
      { title: "Un nombre que confunde", text: "A la media luna también se le llama cuarto creciente. ¡Es porque la Luna ha recorrido un cuarto (1/4) de su mes, no porque se ilumine un cuarto de ella!" },
      { title: "Repártelo de forma justa", text: "Las partes justas tienen que ser iguales. Un pastel de luna cortado en 4 partes iguales da 4 cuartos, uno para cada amigo." }
    ],
    quiz: [
      { q: "Un pastel de luna está cortado en 4 partes iguales. Hana se come 1 parte. ¿Qué fracción se comió?", choices: ["1/4", "1/3", "3/4"], hint: "¿Cuántas partes iguales hay? ¿Cuántas se comió?", explain: "Hana se comió 1 de las 4 partes iguales, así que se comió 1/4." },
      { q: "En media luna, ¿qué fracción de la cara de la Luna vemos iluminada?", choices: ["1/4", "Toda", "1/2"], hint: "Se llama media luna.", explain: "Vemos iluminada la mitad de la cara de la Luna: 1/2." },
      { q: "La pizza de la base lunar tiene 8 porciones iguales. 5 porciones tienen queso. ¿Qué fracción tiene queso?", choices: ["3/8", "5/8", "5/3"], hint: "El número de abajo es cuántas porciones hay en total.", explain: "5 de las 8 porciones iguales tienen queso, así que 5/8 tiene queso." },
      { q: "¿Qué es más grande: 1/2 de un pastel de luna o 1/4 del mismo pastel?", choices: ["1/2", "1/4", "Son iguales"], hint: "Menos partes quiere decir trozos más grandes.", explain: "Si lo cortas en 2, cada trozo es más grande que si lo cortas en 4. Así que 1/2 es más grande." },
      { q: "¿Por qué a la media luna también se le llama cuarto creciente?", choices: ["A la Luna le falta un cuarto", "La Luna ha recorrido un cuarto de su mes", "Es un cuarto de grande"], hint: "Piensa en el mes de la Luna.", explain: "En cuarto creciente, la Luna ha recorrido un cuarto (1/4) de su mes de formas." }
    ]
  },
  'm3-moon-month-days': {
    title: "Los días de un mes lunar", topicName: "Resta en columnas", blurb: "Cuenta los días que hay de una luna llena a la siguiente y resta en columnas.",
    reading: [
      { title: "Un mes lunar", text: "De una luna llena a la siguiente pasan unos 29 días y medio. ¡Por eso nuestros meses duran más o menos eso! En inglés, la palabra «month» (mes) viene de «moon» (luna)." },
      { title: "Ponlos en fila", text: "Para restar números grandes, escríbelos uno debajo del otro: unidades debajo de unidades y decenas debajo de decenas. Empieza siempre por las unidades." },
      { title: "Pedir prestada una decena", text: "Si la cifra de las unidades de arriba es demasiado pequeña, pide prestada 1 decena a la columna de las decenas. Se convierte en 10 unidades más, y ya puedes restar." }
    ],
    quiz: [
      { q: "Una base lunar tiene comida para 52 días. La tripulación gasta la comida de 29 días. ¿Para cuántos días queda comida?", choices: ["23", "37", "33"], hint: "No puedes quitar 9 de 2, así que pide prestada una decena.", explain: "Pide prestada una decena: 12 − 9 = 3. Decenas: 4 − 2 = 2. Queda comida para 23 días." },
      { q: "Este mes tiene 30 días. Han pasado 14 días. ¿Cuántos días quedan?", choices: ["26", "14", "16"], hint: "Para 0 − 4 necesitas pedir prestada una decena.", explain: "Pide prestada una decena: 10 − 4 = 6. Decenas: 2 − 1 = 1. Quedan 16 días." },
      { q: "Un róver tiene que recorrer 81 km. Ya ha recorrido 45 km. ¿Cuánto le falta?", choices: ["46 km", "36 km", "44 km", "126 km"], hint: "Para 1 − 5 necesitas pedir prestada una decena.", explain: "Pide prestada una decena: 11 − 5 = 6. Decenas: 7 − 4 = 3. Le faltan 36 km." },
      { q: "¿Cuántos días pasan, más o menos, de una luna llena a la siguiente?", choices: ["Unos 7", "Unos 365", "Unos 29 y medio"], hint: "Es casi un mes entero.", explain: "Las formas de la Luna se repiten más o menos cada 29 días y medio." },
      { q: "Hay 64 astronautas en la base lunar. 27 vuelven a casa. ¿Cuántos se quedan?", choices: ["37", "43", "47"], hint: "Para 4 − 7 necesitas pedir prestada una decena.", explain: "Pide prestada una decena: 14 − 7 = 7. Decenas: 5 − 2 = 3. Se quedan 37 astronautas." }
    ]
  },

  // ── Base lunar 4: Valle de la Antena ──
  'm4-moon-weight-sixth': {
    title: "Más ligero en la Luna", topicName: "División", blurb: "En la Luna, las cosas parecen pesar más o menos una sexta parte. ¡Divide entre 6 para averiguarlo!",
    reading: [
      { title: "Una atracción más débil", text: "La Luna es mucho más pequeña que la Tierra, así que su fuerza de atracción, la gravedad, es más débil. En la Luna, las cosas parecen pesar solo 1/6 de lo que pesan en la Tierra, más o menos." },
      { title: "Divide entre 6", text: "Para saber cuánto parece pesar algo en la Luna, reparte su peso en la Tierra en 6 partes iguales y quédate con una. Una bolsa que en la Tierra parece pesar 12 kg, en la Luna parece pesar unos 12 ÷ 6 = 2 kg." },
      { title: "Lo mismo dentro, menos atracción", text: "¡En la Luna no se cae nada de la bolsa! Lleva exactamente las mismas cosas. Solo la atracción sobre ella es más débil, por eso parece más ligera." },
      { title: "Dividir deshace multiplicar", text: "La división deshace la multiplicación. 6 × 5 = 30, así que 30 ÷ 6 = 5." }
    ],
    quiz: [
      { q: "Una roca parece pesar 18 kg en la Tierra. ¿Cuánto parecerá pesar en la Luna? (Divide entre 6.)", choices: ["12 kg", "3 kg", "24 kg"], hint: "¿Qué número por 6 da 18?", explain: "6 × 3 = 18, así que 18 ÷ 6 = 3. Parece pesar unos 3 kg." },
      { q: "Se reparten 36 rocas lunares en partes iguales entre 6 astronautas. ¿Cuántas le tocan a cada uno?", choices: ["6", "5", "30"], hint: "6 × ? = 36", explain: "6 × 6 = 36, así que a cada astronauta le tocan 6 rocas." },
      { q: "Una caja de herramientas parece pesar 24 kg en la Tierra. ¿Cuánto parecerá pesar en la Luna?", choices: ["18 kg", "6 kg", "4 kg"], hint: "24 ÷ 6", explain: "6 × 4 = 24, así que parece pesar unos 4 kg." },
      { q: "40 galletas espaciales se meten en paquetes de 8. ¿Cuántos paquetes hay?", choices: ["32", "5", "48", "8"], hint: "8 × ? = 40", explain: "8 × 5 = 40, así que hay 5 paquetes." },
      { q: "En la Luna, una mochila parece más ligera. ¿Por qué?", choices: ["Se le caen cosas", "La atracción de la Luna sobre ella es más débil"], hint: "¡No se cae nada de la mochila!", explain: "La mochila lleva lo mismo. La gravedad de la Luna tira menos de ella, por eso parece más ligera." }
    ]
  },
  'm4-moon-six-times': {
    title: "Seis veces más alto", topicName: "2 cifras × 1 cifra", blurb: "Con el mismo salto, en la Luna subirías unas seis veces más alto. ¡Multiplica para averiguarlo!",
    reading: [
      { title: "Grandes saltos lunares", text: "Con menos gravedad, subes mucho más alto antes de volver a bajar. Con el mismo impulso, un salto en la Luna subiría unas 6 veces más alto que en la Tierra (¡si no llevaras un traje espacial tan pesado!)." },
      { title: "Separa el número", text: "Para calcular 23 × 6, separa 23 en 20 y 3. 20 × 6 = 120 y 3 × 6 = 18. Luego súmalos: 120 + 18 = 138." },
      { title: "Usa una cuadrícula", text: "Dibuja un rectángulo dividido en dos partes: una para las decenas y otra para las unidades. Multiplica cada parte y luego suma los dos resultados." }
    ],
    quiz: [
      { q: "En la Tierra, Leo salta 25 cm de alto. Con el mismo salto en la Luna, sube 6 veces más alto. ¿Cuánto es?", choices: ["31 cm", "150 cm", "125 cm"], hint: "25 × 6: calcula 20 × 6 y 5 × 6.", explain: "20 × 6 = 120 y 5 × 6 = 30. 120 + 30 = 150 cm." },
      { q: "Hay 3 cúpulas con 14 paneles solares en cada una. ¿Cuántos paneles solares son?", choices: ["42", "17", "32"], hint: "10 × 3 y 4 × 3.", explain: "10 × 3 = 30 y 4 × 3 = 12. 30 + 12 = 42 paneles." },
      { q: "Un róver recorre 32 km cada día durante 4 días. ¿Cuánto recorre?", choices: ["36 km", "118 km", "122 km", "128 km"], hint: "30 × 4 y 2 × 4.", explain: "30 × 4 = 120 y 2 × 4 = 8. 120 + 8 = 128 km." },
      { q: "Una pelota lanzada hacia arriba en la Tierra sube 12 m. Lanzada igual en la Luna, sube 6 veces más alto. ¿Cuánto sube?", choices: ["18 m", "62 m", "72 m"], hint: "12 × 6: calcula 10 × 6 y 2 × 6.", explain: "10 × 6 = 60 y 2 × 6 = 12. 60 + 12 = 72 m." },
      { q: "Para calcular 47 × 5, ¿cómo puedes separar 47?", choices: ["En 40 y 7", "En 4 y 5", "En 45 y 5"], hint: "Sepáralo en decenas y unidades.", explain: "47 es 40 y 7. 40 × 5 = 200 y 7 × 5 = 35, así que 47 × 5 = 235." }
    ]
  },

  // ── Base lunar 5: Cráter del Invernadero ──
  'm5-moon-base-area': {
    title: "Planear una base lunar", topicName: "Área y perímetro", blurb: "Pon una valla al patio de los róveres y cubre de baldosas el suelo del invernadero: área y perímetro en la Luna.",
    reading: [
      { title: "Perímetro: el borde", text: "El perímetro es la distancia alrededor de toda una figura. Un patio para róveres de 8 m de largo y 5 m de ancho tiene un perímetro de 8 + 5 + 8 + 5 = 26 m." },
      { title: "Área: el interior", text: "El área es cuánto espacio hay dentro de una figura. Cuenta los cuadrados o multiplica largo × ancho: 8 × 5 = 40 metros cuadrados." },
      { title: "Atrapar la luz del sol", text: "Las bases lunares necesitan energía del Sol. Quienes las planean calculan el área de sus paneles solares para saber cuánta luz del sol pueden atrapar." }
    ],
    quiz: [
      { q: "El suelo de un invernadero mide 6 m de largo y 4 m de ancho. ¿Cuál es su área?", choices: ["10 metros cuadrados", "20 metros cuadrados", "24 metros cuadrados"], hint: "Multiplica largo × ancho.", explain: "6 × 4 = 24 metros cuadrados." },
      { q: "Un patio para róveres mide 9 m de largo y 3 m de ancho. ¿Cuánta valla hace falta para rodearlo entero?", choices: ["24 m", "12 m", "27 m"], hint: "Suma los cuatro lados.", explain: "9 + 3 + 9 + 3 = 24 m de valla." },
      { q: "Una plataforma de aterrizaje cuadrada tiene lados de 7 m. ¿Cuál es su área?", choices: ["28 metros cuadrados", "49 metros cuadrados", "14 metros cuadrados"], hint: "7 × 7", explain: "7 × 7 = 49 metros cuadrados." },
      { q: "Un campo de paneles solares mide 12 m de largo y 5 m de ancho. ¿Cuál es su área?", choices: ["34 metros cuadrados", "17 metros cuadrados", "60 metros cuadrados"], hint: "12 × 5", explain: "12 × 5 = 60 metros cuadrados." },
      { q: "¿Cuál mide la distancia alrededor de todo el borde?", choices: ["El área", "El perímetro", "El volumen"], hint: "«Peri» quiere decir «alrededor».", explain: "El perímetro es la distancia alrededor del borde. El área es el espacio de dentro." }
    ]
  },
  'm5-moon-decimals': {
    title: "Decimales lunares", topicName: "Decimales", blurb: "Mide la Luna en décimas: 29,5 días, 27,3 días y más.",
    reading: [
      { title: "Décimas", text: "La coma decimal separa los números enteros de las partes. 29,5 quiere decir 29 días enteros y 5 décimas de día. Cinco décimas son una mitad, así que son 29 días y medio." },
      { title: "Dos tipos de mes lunar", text: "La Luna da una vuelta alrededor de la Tierra en unos 27,3 días. Pero de luna llena a luna llena pasan unos 29,5 días, porque mientras tanto la Tierra también ha avanzado en su viaje alrededor del Sol." },
      { title: "Comparar decimales", text: "Para comparar 27,3 y 29,5, mira primero los números enteros. 29 es más que 27, así que 29,5 es más grande." },
      { title: "Sumar décimas", text: "Las décimas se suman igual que las unidades: 0,4 + 0,3 = 0,7. Si llegas a 10 décimas, forman 1 entero." }
    ],
    quiz: [
      { q: "¿Qué es más grande: 27,3 o 29,5?", choices: ["29,5", "27,3"], hint: "Compara primero los números enteros.", explain: "29 es más que 27, así que 29,5 es más grande." },
      { q: "Una roca lunar mide 2,4 cm de largo. Otra mide 1,3 cm. ¿Cuánto miden puestas una detrás de otra?", choices: ["3,1 cm", "3,7 cm", "37 cm"], hint: "Suma los enteros y luego las décimas.", explain: "2 + 1 = 3 y 0,4 + 0,3 = 0,7, así que juntas miden 3,7 cm." },
      { q: "¿Qué quiere decir 29,5 días?", choices: ["29 días y 5 horas", "295 días", "29 días y medio"], hint: "5 décimas es lo mismo que una mitad.", explain: "29,5 son 29 enteros y 5 décimas, y 5 décimas son una mitad." },
      { q: "Un róver recorre 4,6 km y luego 2,2 km. ¿Cuánto recorre en total?", choices: ["6,4 km", "68 km", "2,4 km", "6,8 km"], hint: "4 + 2 y luego 0,6 + 0,2.", explain: "4 + 2 = 6 y 0,6 + 0,2 = 0,8, así que recorre 6,8 km." },
      { q: "¿Qué decimal es lo mismo que una mitad?", choices: ["0,2", "0,5", "0,05"], hint: "La mitad de 10 décimas.", explain: "Una mitad son 5 décimas, y se escribe 0,5." }
    ]
  },

  // ── Base lunar 6: Cuevas de Cristal ──
  'm6-moon-hot-cold': {
    title: "Días ardientes y noches heladas", topicName: "Números negativos", blurb: "En la Luna, el suelo pasa de estar más caliente que el agua hirviendo a muy por debajo de cero.",
    reading: [
      { title: "Sin manta de aire", text: "El aire de la Tierra funciona como una manta que mantiene las temperaturas suaves. La Luna no tiene aire, así que su suelo se calienta muchísimo al sol y se enfría muchísimo en la oscuridad." },
      { title: "Bajo cero", text: "Las temperaturas por debajo de 0 °C son números negativos, como −20 °C. Cuanto más grande es el número que va después del signo menos, más frío hace." },
      { title: "Temperaturas lunares", text: "Cerca del ecuador de la Luna, el suelo puede llegar a unos 120 °C de día y bajar a unos −130 °C de noche. ¡Algunos cráteres profundos y oscuros cerca de los polos son todavía más fríos!" },
      { title: "Usa una recta numérica", text: "Para hallar la diferencia entre una temperatura caliente y una fría, cuenta desde el número negativo hasta el 0, luego sigue hasta el número positivo, y suma las dos partes." }
    ],
    quiz: [
      { q: "¿Qué temperatura es más fría: −50 °C o −10 °C?", choices: ["−10 °C", "−50 °C"], hint: "Cuanto más por debajo de cero, más frío.", explain: "−50 °C son 50 grados bajo cero, mucho más frío que −10 °C." },
      { q: "Un termómetro marca −8 °C. La temperatura sube 12 grados. ¿Qué marca ahora?", choices: ["4 °C", "−20 °C", "20 °C"], hint: "8 pasos hasta el 0 y luego 4 más.", explain: "Desde −8, con 8 pasos llegas a 0, y con 4 pasos más llegas a 4 °C." },
      { q: "El suelo está a 100 °C de día y a −100 °C de noche. ¿Cuál es la diferencia?", choices: ["0 grados", "100 grados", "200 grados"], hint: "De 100 hasta 0, y luego 100 más.", explain: "De 100 hasta 0 hay 100 grados, y de 0 hasta −100 hay 100 más: 200 grados." },
      { q: "A la sombra, una roca está a −30 °C. La haces rodar hasta el sol y se calienta 50 grados. ¿A qué temperatura está ahora?", choices: ["80 °C", "−80 °C", "20 °C", "−20 °C"], hint: "30 pasos hasta llegar a 0, y luego 20 más.", explain: "−30 + 50 = 20 °C." },
      { q: "¿Por qué en la Luna hace tanto calor y tanto frío?", choices: ["Está hecha de hielo", "No tiene aire que haga de manta", "Gira muy deprisa"], hint: "Piensa en qué tiene la Tierra que la Luna no tiene.", explain: "La Luna no tiene aire que guarde el calor o lo reparta, así que su suelo se pone muy caliente de día y muy frío de noche." }
    ]
  },
  'm6-moon-percent': {
    title: "Porcentajes lunares", topicName: "Porcentajes", blurb: "¿Cuánta fuerza, cuánta luz, cuánta carga? Encuentra porcentajes por toda la Luna.",
    reading: [
      { title: "De cada 100", text: "Por ciento quiere decir «de cada 100». El 50% es 50 de cada 100, que es la mitad. El 25% es un cuarto." },
      { title: "¿Cuánta fuerza tiene la gravedad lunar?", text: "La gravedad de la Luna tiene más o menos el 17% de la fuerza de la gravedad de la Tierra. Eso es más o menos una sexta parte." },
      { title: "Siempre medio iluminada", text: "El Sol siempre ilumina el 50% de la Luna: la mitad que está de cara a él. Lo que cambia es cuánto de esa mitad iluminada podemos ver desde la Tierra." },
      { title: "Calcular un porcentaje", text: "Para hallar el 10% de un número, divídelo entre 10. Para hallar el 20%, halla el 10% y multiplícalo por 2." }
    ],
    quiz: [
      { q: "¿Cuánto es el 50% de 80 rocas lunares?", choices: ["50", "40", "8"], hint: "El 50% es la mitad.", explain: "La mitad de 80 es 40." },
      { q: "¿Cuánto es el 10% de 300 km?", choices: ["30 km", "3 km", "310 km"], hint: "Divide entre 10.", explain: "300 ÷ 10 = 30 km." },
      { q: "Una tripulación tiene 20 astronautas, y el 25% son científicos. ¿Cuántos científicos son?", choices: ["25", "4", "20", "5"], hint: "El 25% es un cuarto.", explain: "Un cuarto de 20 es 5." },
      { q: "¿Qué parte de la Luna ilumina el Sol en cada momento?", choices: ["Más o menos el 10%", "El 100%", "Más o menos el 50%"], hint: "La cara que mira al Sol.", explain: "El Sol siempre ilumina la mitad de la Luna que está de cara a él: el 50%." },
      { q: "Una batería de la base lunar está al 60%. ¿Cuánta carga más necesita para llegar al 100%?", choices: ["40%", "60%", "160%"], hint: "100 − 60", explain: "100% − 60% = 40%." }
    ]
  },

  // ── Base lunar 7: Estación Luz de Estrellas ──
  'm7-moon-mission-equations': {
    title: "Ecuaciones para planear la misión", topicName: "Ecuaciones de dos pasos", blurb: "Planea un viaje a la Luna deshaciendo dos pasos.",
    reading: [
      { title: "Muy lejos", text: "La Luna está a unos 384 000 km de la Tierra. ¡Es como dar casi 10 vueltas a la Tierra! Los astronautas del Apolo tardaban unos 3 días en llegar." },
      { title: "Dos pasos", text: "En 3x + 5 = 20, un número misterioso x se multiplicó por 3 y luego se le sumó 5. Para hallar x, deshaz los pasos en orden inverso." },
      { title: "Deshaz, deshaz", text: "Resta 5 en los dos lados: 3x = 15. Luego divide los dos lados entre 3: x = 5. Compruébalo: 3 × 5 + 5 = 20 ✓." }
    ],
    quiz: [
      { q: "Resuelve 4x + 6 = 30.", choices: ["9", "6", "24"], hint: "Resta 6 y luego divide entre 4.", explain: "4x = 24, así que x = 6. Comprobación: 4 × 6 + 6 = 30." },
      { q: "Después de una prueba de 8 km, un róver va a x km por hora durante 5 horas. En total recorre 58 km: 5x + 8 = 58. ¿Cuánto vale x?", choices: ["10", "12", "50"], hint: "Resta 8 y luego divide entre 5.", explain: "5x = 50, así que x = 10 km cada hora." },
      { q: "Resuelve 2x − 7 = 13.", choices: ["3", "6", "10"], hint: "Suma 7 y luego divide entre 2.", explain: "2x = 20, así que x = 10. Comprobación: 2 × 10 − 7 = 13." },
      { q: "3 astronautas preparan x tentempiés cada uno, y el capitán añade 9 más. Hay 45 tentempiés: 3x + 9 = 45. ¿Cuántos preparó cada astronauta?", choices: ["18", "15", "9", "12"], hint: "Resta 9 y luego divide entre 3.", explain: "3x = 36, así que x = 12 tentempiés cada uno." },
      { q: "¿A qué distancia está la Luna, más o menos?", choices: ["A unos 3840 km", "A unos 384 000 km", "A unos 38 millones de km"], hint: "Casi 10 vueltas a la Tierra.", explain: "De media, la Luna está a unos 384 000 km." }
    ]
  },
  'm7-moon-square-pads': {
    title: "Plataformas cuadradas y raíces cuadradas", topicName: "Cuadrados y raíces", blurb: "Plataformas de aterrizaje y paneles solares cuadrados: halla el área a partir del lado, y el lado a partir del área.",
    reading: [
      { title: "Números cuadrados", text: "Un número cuadrado es un número multiplicado por sí mismo. 6 × 6 = 36, así que 36 es un número cuadrado. Se escribe 6²." },
      { title: "Raíces cuadradas", text: "La raíz cuadrada deshace el cuadrado. √36 = 6, porque 6 × 6 = 36. Si una plataforma de aterrizaje cuadrada cubre 36 m², cada lado mide 6 m." },
      { title: "Entre medias", text: "√50 no es un número entero. 7² = 49 y 8² = 64, así que √50 es un poquito más que 7." }
    ],
    quiz: [
      { q: "Una plataforma de aterrizaje cuadrada tiene lados de 9 m. ¿Cuál es su área?", choices: ["18 m²", "81 m²", "90 m²"], hint: "9 × 9", explain: "9² = 81 m²." },
      { q: "Un panel solar cuadrado cubre 64 m². ¿Cuánto mide cada lado?", choices: ["8 m", "16 m", "32 m"], hint: "¿Qué número multiplicado por sí mismo da 64?", explain: "8 × 8 = 64, así que cada lado mide 8 m." },
      { q: "¿Cuánto es √121?", choices: ["12", "60,5", "11"], hint: "Prueba 11 × 11.", explain: "11 × 11 = 121, así que √121 = 11." },
      { q: "¿Entre qué dos números enteros está √90?", choices: ["8 y 9", "9 y 10", "10 y 11"], hint: "9² = 81 y 10² = 100.", explain: "81 < 90 < 100, así que √90 está entre 9 y 10." },
      { q: "Un invernadero cuadrado tiene lados de 12 m. ¿Cuál es el área de su suelo?", choices: ["24 m²", "48 m²", "124 m²", "144 m²"], hint: "12 × 12", explain: "12² = 144 m²." }
    ]
  },

  // ───────── Museo Lunar (historia) ─────────
  // ── Base lunar 1: Cráter del Aterrizaje ──
  'h1-moon-rabbit-tales': {
    title: "El conejo de la Luna",
    topicName: "Cuentos de la Luna de todo el mundo",
    blurb: "Busca el conejo en la luna llena y escucha cuentos de la Luna de todo el mundo.",
    reading: [
      { title: "Mira la luna llena", text: "La luna llena tiene manchas claras y oscuras. Gente de todo el mundo ha mirado esas manchas y ha visto dibujos en ellas." },
      { title: "Un conejo con un mortero", text: "En Corea y en Japón, mucha gente ve un conejo que machaca pasteles de arroz en un gran cuenco llamado mortero. En China, el Conejo de Jade machaca una medicina para Chang'e, la dama de la Luna." },
      { title: "Más dibujos en la Luna", text: "Hay quien ve un hombre en la Luna, y hay quien ve un sapo. Un cuento antiguo de la India habla de una liebre bondadosa que vive en la Luna, ¡y en un cuento azteca de México también hay un conejo allí!" },
      { title: "Qué son de verdad las manchas", text: "Las manchas oscuras son grandes llanuras de lava antigua que se enfrió hace muchísimo tiempo. Antes la gente creía que eran mares, por eso todavía se llaman «mares» lunares (en latín, «maria»)." }
    ],
    dialogue: {
      npc: { name: "Abuela Bomi", role: "una cuentacuentos que colecciona historias de la Luna" },
      intro: "¡Ven, siéntate a mi lado, pequeño! Ya ha salido la luna llena. ¿Ves el conejo? Deja que te cuente unas historias de la Luna.",
      topics: [
        { ask: "¿Dónde está el conejo?", answer: "Mira las manchas oscuras de la luna llena. Las orejas largas están a un lado, y debajo están el cuerpo redondo y el gran cuenco. ¡Cuando lo ves una vez, ya no puedes dejar de verlo!" },
        { ask: "¿Qué hace el conejo?", answer: "En Corea, el conejo machaca pasteles de arroz que se llaman tteok. En Japón, prepara mochi. En China, el Conejo de Jade machaca una medicina especial para Chang'e, la dama que vive en la Luna." },
        { ask: "¿Quién es Chang'e?", answer: "En un antiguo cuento chino, Chang'e subió flotando hasta la Luna, y allí vive con su Conejo de Jade. Las familias se acuerdan de ella en el Festival del Medio Otoño, cuando la Luna está grande y redonda." },
        { ask: "¿Hay más gente que vea un conejo?", answer: "¡Sí! Un cuento antiguo de la India habla de una liebre bondadosa cuya imagen se puso en la Luna, y en un cuento azteca de México también hay un conejo allá arriba. Otras personas ven una cara o un sapo." },
        { ask: "¿De verdad hay un conejo allá arriba?", answer: "No, los dibujos los forman llanuras oscuras de lava antigua y terrenos claros llenos de montañas. ¡Pero los cuentos nos ayudan a acordarnos de mirar al cielo y maravillarnos!" }
      ],
      challenge: {
        q: "En Corea, ¿qué machaca el conejo de la Luna en su mortero?",
        choices: ["Piedras", "Pasteles de arroz", "Nieve"],
        explain: "En los cuentos coreanos, el conejo de la Luna machaca pasteles de arroz, que se llaman tteok."
      },
      farewell: "La próxima luna llena, mira al cielo y salúdame al conejo."
    },
    timeline: {
      title: "Las personas y la Luna",
      events: [
        { label: "Una pintura sobre seda de China muestra una liebre y un sapo en la Luna", when: "hace unos 2200 años" },
        { label: "En Japón se celebran fiestas para mirar la Luna llamadas tsukimi", when: "hace unos 1100 años" },
        { label: "Galileo mira la Luna con un telescopio y ve montañas y cráteres", when: "1609" },
        { label: "Unos astronautas caminan por la Luna por primera vez", when: "1969" },
        { label: "El róver chino Yutu, llamado así por el Conejo de Jade, recorre la Luna", when: "2013" }
      ]
    },
    artifact: {
      name: "Un mortero y su mano",
      text: "Un mortero es un cuenco muy resistente, y la mano del mortero es el palo pesado con el que se machaca. En los cuentos, el conejo de la Luna usa uno muy grande para machacar pasteles de arroz o medicinas. Hoy todavía se usan en las cocinas."
    },
    quiz: [
      { q: "¿Qué ve mucha gente de Corea y Japón en la luna llena?", choices: ["Un gato en una barca", "Un conejo que machaca pasteles de arroz", "Un pez gigante"], hint: "Tiene las orejas largas.", explain: "Mucha gente de Corea y Japón ve en la Luna un conejo que machaca pasteles de arroz." },
      { q: "¿Qué son de verdad las manchas oscuras de la Luna?", choices: ["Llanuras de lava antigua ya enfriada", "Mares de agua de verdad", "Sombras de nubes"], hint: "Las formó roca derretida hace mucho tiempo.", explain: "Las manchas oscuras son grandes llanuras de lava que se enfrió hace muchísimo tiempo." },
      { q: "¿Quién es Chang'e en el cuento chino?", choices: ["Un cohete", "El cuenco de un conejo", "La dama que vive en la Luna"], hint: "El Conejo de Jade le prepara una medicina.", explain: "Chang'e es la dama de la Luna del cuento chino, y el Conejo de Jade vive con ella." },
      { q: "¿Qué róver lunar se llamó así por el Conejo de Jade?", choices: ["Sputnik", "Yutu", "Apolo"], hint: "Es un nombre chino.", explain: "Yutu quiere decir Conejo de Jade. El róver chino Yutu recorrió la Luna en 2013." },
      { q: "¿Por qué las manchas oscuras se llaman «mares» (en latín, «maria»)?", choices: ["Porque «maria» quiere decir «conejos»", "Porque es el nombre de una persona", "Porque antes la gente creía que eran mares"], hint: "Antes se pensaba que estaban llenas de agua.", explain: "«Maria» quiere decir «mares» en latín. Hace mucho tiempo, la gente creía que las manchas oscuras eran mares." }
    ]
  },
  'h1-moon-festivals': {
    title: "Fiestas de la luna llena",
    topicName: "Fiestas de la Luna",
    blurb: "Prepara songpyeon y pasteles de luna, y contempla la luna de la cosecha con un cocinero de fiestas.",
    reading: [
      { title: "La gran luna de otoño", text: "En otoño, muchas familias del este de Asia lo celebran cuando la luna llena está grande y brillante. Es la época de la cosecha, cuando los cultivos ya están listos." },
      { title: "El Chuseok en Corea", text: "En el Chuseok, las familias coreanas visitan su pueblo, dan las gracias a sus abuelos y antepasados, y preparan unos pastelitos de arroz con forma de media luna llamados songpyeon." },
      { title: "El Medio Otoño en China", text: "En el Festival del Medio Otoño, las familias comparten pasteles de luna redondos, llevan farolillos encendidos y miran la Luna todas juntas." },
      { title: "El tsukimi en Japón", text: "Tsukimi quiere decir «mirar la luna». En Japón, la gente pone bolitas de arroz redondas y altas hierbas plateadas, y disfruta de la Luna." }
    ],
    dialogue: {
      npc: { name: "Chef Momo", role: "un cocinero de fiestas que prepara dulces de luna" },
      intro: "¡Hola! Soy el chef Momo, y esta noche hay una gran luna llena. ¡Mi cocina huele a arroz dulce y a frijoles rojos! ¿Me ayudas a preparar dulces para la fiesta?",
      topics: [
        { ask: "¿Por qué se celebra la luna llena?", answer: "¡Porque es tiempo de cosecha! El arroz y la fruta ya están listos, y la gran luna redonda recuerda a las familias que se reúnan y den las gracias." },
        { ask: "¿Qué son los songpyeon?", answer: "Los songpyeon son pastelitos de arroz coreanos para el Chuseok. Los rellenamos de sésamo y miel, de frijoles o de castañas, les damos forma de media luna y los cocemos al vapor sobre agujas de pino. ¡Huelen de maravilla!" },
        { ask: "¿Qué hay dentro de un pastel de luna?", answer: "Los pasteles de luna son redondos, como la luna llena. Muchos están rellenos de pasta dulce de semillas de loto o de frijoles rojos, ¡y algunos llevan en el centro una yema de huevo salada, como una lunita dentro!" },
        { ask: "¿Qué hace la gente en el tsukimi?", answer: "En Japón, la gente apila unas bolitas blancas y redondas llamadas tsukimi dango, pone altas hierbas plateadas en un jarrón y se sienta tranquila a admirar la Luna." },
        { ask: "¿De verdad la Luna es más grande en la época de la cosecha?", answer: "Parece enorme cuando está baja, cerca del horizonte, ¡pero es un truco de nuestros ojos! La Luna tiene siempre más o menos el mismo tamaño." }
      ],
      challenge: {
        q: "¿Por qué los pasteles de luna son redondos?",
        choices: ["Para que rueden cuesta abajo", "Porque los hornos son redondos", "Para parecerse a la luna llena"],
        explain: "Los pasteles de luna son redondos como la luna llena, un símbolo de toda la familia reunida."
      },
      farewell: "¡Feliz luna llena! Comparte tus dulces y mira la Luna esta noche con tu familia."
    },
    timeline: {
      title: "Las fiestas de la Luna a lo largo del tiempo",
      events: [
        { label: "Un antiguo libro de historia coreano cuenta un concurso de la cosecha bajo la luna llena: un Chuseok de los primeros tiempos", when: "hace unos 2000 años" },
        { label: "En Japón empiezan a celebrarse fiestas para mirar la Luna", when: "hace unos 1100 años" },
        { label: "En China, el Festival del Medio Otoño se convierte en una fiesta muy popular", when: "hace unos 1000 años" },
        { label: "El Festival del Medio Otoño pasa a ser día festivo oficial en la China continental", when: "2008" }
      ]
    },
    artifact: {
      name: "Un pastel de luna",
      text: "Un pastel de luna es un pastelito redondo con un dibujo marcado encima, a menudo una flor o una palabra de buena suerte. Las familias lo cortan en trozos para que todos reciban su parte."
    },
    quiz: [
      { q: "¿Qué preparan las familias coreanas para el Chuseok?", choices: ["Crepes", "Helado", "Pastelitos de arroz songpyeon"], hint: "Tienen forma de media luna.", explain: "En el Chuseok, las familias preparan songpyeon, pastelitos de arroz con forma de media luna." },
      { q: "¿Cómo se llama la fiesta japonesa para mirar la Luna?", choices: ["Tsukimi", "Chuseok", "Diwali"], hint: "Quiere decir «mirar la luna».", explain: "Tsukimi quiere decir «mirar la luna». En Japón, la gente admira la luna de otoño." },
      { q: "¿Qué comparten las familias en el Festival del Medio Otoño en China?", choices: ["Bolas de nieve", "Pasteles de luna", "Calabazas"], hint: "Son redondos, como la luna llena.", explain: "En el Festival del Medio Otoño, las familias comparten pasteles de luna redondos." },
      { q: "¿Por qué estas fiestas son en otoño?", choices: ["Es la época de la cosecha", "Es la época de más calor", "La Luna desaparece"], hint: "Los cultivos ya están listos.", explain: "El otoño es la época de la cosecha, y las familias dan las gracias bajo la gran luna llena." },
      { q: "¿De verdad la Luna se hace más grande cerca del horizonte?", choices: ["Sí, crece el doble", "No, es un truco de nuestros ojos"], hint: "La Luna tiene siempre el mismo tamaño.", explain: "La Luna solo parece más grande cerca del horizonte. Es un truco de nuestros ojos." }
    ]
  },

  // ── Base lunar 2: Loma del Cohete ──
  'h2-moon-galileo': {
    title: "Galileo mira al cielo",
    topicName: "Galileo y el telescopio",
    blurb: "Mira con Galileo por uno de los primeros telescopios y descubre montañas en la Luna.",
    reading: [
      { title: "Un invento nuevo", text: "En 1608, unos fabricantes de anteojos de los Países Bajos pusieron dos lentes de cristal en un tubo y consiguieron que las cosas lejanas parecieran más cerca. ¡Era el telescopio!" },
      { title: "Galileo construye el suyo", text: "En Italia, Galileo Galilei oyó hablar del invento y construyó sus propios telescopios, cada uno más potente que el anterior. En 1609 apuntó uno hacia la Luna." },
      { title: "¡Montañas en la Luna!", text: "Mucha gente creía que la Luna era perfectamente lisa. Galileo vio montañas, valles y cráteres, y dibujó lo que veía." },
      { title: "Lunas alrededor de Júpiter", text: "En 1610, Galileo descubrió cuatro pequeñas lunas que giraban alrededor del planeta Júpiter. Escribió sobre sus descubrimientos en un libro llamado «El mensajero sideral»." }
    ],
    dialogue: {
      npc: { name: "Galileo Galilei", role: "un científico italiano que observaba las estrellas" },
      intro: "¡Buongiorno! Soy Galileo. Ven, mira por mi telescopio. Esta noche la Luna está preciosa, ¡y vas a ver algo que nadie se esperaba!",
      topics: [
        { ask: "¿Cómo funciona tu telescopio?", answer: "Es un tubo con una lente de cristal en cada extremo. Las lentes desvían la luz para que las cosas lejanas se vean más grandes y más cerca. ¡El mejor que tengo hace que las cosas se vean unas 20 veces más grandes!" },
        { ask: "¿Qué viste en la Luna?", answer: "¡Montañas! Y agujeros redondos y profundos, y sombras alargadas. Donde la luz se junta con la oscuridad, las cimas de las montañas reciben primero la luz del sol, igual que las montañas al amanecer en la Tierra." },
        { ask: "¿Por qué fue una sorpresa?", answer: "Mucha gente creía que la Luna era una bola perfecta y lisa. Mis dibujos mostraron que es rocosa y llena de bultos: un mundo de verdad, un poco parecido al nuestro." },
        { ask: "¿Qué más descubriste?", answer: "¡Cuatro pequeñas lunas que giran alrededor de Júpiter! Las observé moverse noche tras noche. También vi que la Vía Láctea está hecha de muchísimas estrellas." },
        { ask: "¿Cómo recuerdas lo que viste?", answer: "¡Lo dibujo! Dibujo la Luna con cuidado, noche tras noche, para que otros puedan ver lo que yo vi y comprobarlo. Los buenos científicos lo apuntan y lo dibujan todo." }
      ],
      challenge: {
        q: "¿Qué vio Galileo en la Luna con su telescopio?",
        choices: ["Ríos y árboles", "Montañas y cráteres", "Un conejo"],
        explain: "Galileo vio montañas, valles y cráteres. La Luna era rocosa, no lisa."
      },
      farewell: "Sigue mirando al cielo y dibuja siempre lo que veas. ¡Arrivederci!"
    },
    timeline: {
      title: "Los telescopios y la Luna",
      events: [
        { label: "Galileo nace en Pisa, Italia", when: "1564" },
        { label: "Se inventa el telescopio en los Países Bajos", when: "1608" },
        { label: "Galileo mira la Luna y dibuja sus montañas", when: "1609" },
        { label: "Galileo descubre cuatro lunas que giran alrededor de Júpiter", when: "1610" },
        { label: "Una nave espacial llamada Galileo sale rumbo a Júpiter", when: "1989" }
      ]
    },
    artifact: {
      name: "El telescopio de Galileo",
      text: "Los telescopios de Galileo eran tubos largos de madera forrados de papel o de cuero, con una lente de cristal en cada extremo. Hoy se guardan dos de ellos en un museo de Florencia, en Italia."
    },
    quiz: [
      { q: "¿Qué usó Galileo para mirar la Luna de cerca?", choices: ["Un microscopio", "Un espejo", "Un telescopio"], hint: "Un tubo con lentes.", explain: "Galileo usó un telescopio que construyó él mismo." },
      { q: "Antes de Galileo, ¿cómo creía mucha gente que era la Luna?", choices: ["Perfectamente lisa", "Cubierta de árboles", "Hecha de queso"], hint: "Los dibujos de Galileo demostraron que se equivocaban.", explain: "Mucha gente creía que la Luna era perfectamente lisa, pero Galileo mostró que tiene montañas y cráteres." },
      { q: "¿Qué descubrió Galileo girando alrededor de Júpiter?", choices: ["Anillos de hielo", "Cuatro lunas", "Una nave espacial"], hint: "Lucecitas que se movían noche tras noche.", explain: "En 1610, Galileo descubrió cuatro lunas que giraban alrededor de Júpiter." },
      { q: "¿En qué año miró Galileo la Luna por primera vez con su telescopio?", choices: ["1969", "1492", "1609"], hint: "Hace unos 400 años.", explain: "Galileo apuntó su telescopio hacia la Luna en 1609." },
      { q: "¿Por qué dibujaba Galileo lo que veía?", choices: ["Para que otros pudieran verlo y comprobarlo", "Porque no tenía papel", "Para vender los dibujos como juguetes"], hint: "Los científicos comparten lo que descubren.", explain: "Con dibujos cuidadosos, otras personas podían ver y comprobar sus descubrimientos." }
    ]
  },
  'h2-moon-sputnik': {
    title: "¡Bip, bip! El primer satélite",
    topicName: "Los satélites",
    blurb: "Escucha los bips del Sputnik, el primer satélite, con una joven aficionada a la radio en 1957.",
    reading: [
      { title: "¿Qué es un satélite?", text: "Un satélite es algo que da vueltas y vueltas alrededor de un planeta. La Luna es el satélite natural de la Tierra. ¡Las personas también pueden construir satélites!" },
      { title: "El Sputnik", text: "El 4 de octubre de 1957, la Unión Soviética lanzó el Sputnik 1, el primer satélite hecho por personas. Era una bola de metal brillante, más o menos tan ancha como una pelota de playa, con cuatro antenas largas." },
      { title: "Bip, bip, bip", text: "El Sputnik enviaba bips por radio mientras daba vueltas a la Tierra, más o menos una vuelta cada hora y media. Gente de todo el mundo intentaba oírlo con sus radios." },
      { title: "Los satélites hoy", text: "Hoy, miles de satélites nos ayudan con el pronóstico del tiempo, los mapas, las llamadas de teléfono y la televisión. El primer satélite de Corea, Uribyeol 1, subió al espacio en 1992." }
    ],
    dialogue: {
      npc: { name: "Lena", role: "una joven aficionada a la radio que escucha el cielo, 1957" },
      intro: "¡Chist, escucha! ¿Lo oyes? Bip… bip… bip… ¡Es el Sputnik, volando muy alto sobre nosotros! Soy Lena, y llevo toda la tarde esperando para oírlo.",
      topics: [
        { ask: "¿Qué es el Sputnik?", answer: "¡Es el primerísimo satélite que han hecho las personas! Una bola de metal brillante con cuatro antenas largas, que da vueltas y vueltas alrededor de la Tierra." },
        { ask: "¿A qué velocidad va?", answer: "¡Muy, muy rápido! Da una vuelta entera a la Tierra en más o menos una hora y media. En una tarde despejada, hasta puedes ver el cohete que lo subió, como un puntito de luz que se mueve." },
        { ask: "¿Por qué hace bip?", answer: "Su radio envía bips para que la gente en la Tierra pueda seguirlo. Cualquiera que tenga la radio adecuada puede escucharlo, ¡hasta yo!" },
        { ask: "¿Por qué está todo el mundo tan emocionado?", answer: "¡Porque quiere decir que podemos enviar cosas al espacio! Después se enviarán más satélites, y algún día, quizá, también personas." },
        { ask: "¿Qué podrían hacer los satélites algún día?", answer: "Sueño con que nos ayuden a predecir el tiempo, a enviar imágenes de televisión de un lado al otro del océano y a que los barcos encuentren su camino. ¿No sería maravilloso?" }
      ],
      challenge: {
        q: "¿Qué enviaba el Sputnik a la gente de la Tierra?",
        choices: ["Bips por radio", "Cartas", "Fotos de la Luna"],
        explain: "El Sputnik enviaba bips por radio que la gente podía oír con sus radios."
      },
      farewell: "¡Ahí va, por encima de las colinas! Mira al cielo esta noche: quizá veas un satélite deslizándose entre las estrellas."
    },
    timeline: {
      title: "Los satélites",
      events: [
        { label: "El Sputnik 1, el primer satélite, da vueltas alrededor de la Tierra", when: "1957" },
        { label: "Estados Unidos lanza su primer satélite, el Explorer 1", when: "1958" },
        { label: "El satélite Telstar envía imágenes de televisión en directo de un lado al otro del océano Atlántico", when: "1962" },
        { label: "Se lanza el primer satélite GPS", when: "1978" },
        { label: "Se lanza el primer satélite de Corea, Uribyeol 1", when: "1992" }
      ]
    },
    artifact: {
      name: "Una maqueta del Sputnik 1",
      text: "El Sputnik 1 era una bola de metal pulido de unos 58 centímetros de ancho, con cuatro antenas largas detrás. Dentro llevaba radios y baterías. Estuvo enviando sus bips durante unas tres semanas."
    },
    quiz: [
      { q: "¿Qué fue el Sputnik 1?", choices: ["La primera persona en el espacio", "El primer satélite hecho por personas", "Un róver lunar"], hint: "Daba vueltas y vueltas alrededor de la Tierra.", explain: "El Sputnik 1 fue el primer satélite hecho por personas, lanzado en 1957." },
      { q: "¿Cuál es el satélite natural de la Tierra?", choices: ["La Luna", "El Sol", "Marte"], hint: "Lo puedes ver de noche.", explain: "La Luna da vueltas alrededor de la Tierra, así que es el satélite natural de la Tierra." },
      { q: "¿Cuánto tardaba el Sputnik, más o menos, en dar una vuelta a la Tierra?", choices: ["Una semana", "Un año", "Una hora y media"], hint: "¡Era muy rápido!", explain: "El Sputnik daba una vuelta a la Tierra más o menos cada hora y media." },
      { q: "¿Cómo sabía la gente dónde estaba el Sputnik?", choices: ["Dejaba un rastro de humo", "Escuchaban sus bips por radio", "Hacía destellos de colores"], hint: "¡Bip, bip, bip!", explain: "Los bips de radio del Sputnik permitían seguirlo por el cielo." },
      { q: "¿Con cuál de estas cosas nos ayudan hoy los satélites?", choices: ["El pronóstico del tiempo y los mapas", "Hacer pan", "Cultivar árboles"], hint: "Piensa en el mapa de un teléfono.", explain: "Los satélites ayudan con el pronóstico del tiempo, los mapas, la televisión y las llamadas de teléfono." }
    ]
  },

  // ── Base lunar 3: Huellas del Róver ──
  'h3-moon-gagarin': {
    title: "Yuri Gagarin, el primero en el espacio",
    topicName: "Las primeras personas en el espacio",
    blurb: "Da una vuelta a la Tierra con Yuri Gagarin, la primera persona que viajó al espacio.",
    reading: [
      { title: "Un niño de pueblo al que le encantaba volar", text: "Yuri Gagarin creció en un pueblecito de Rusia. Le encantaban los aviones, aprendió a volar y se hizo piloto." },
      { title: "¡Vámonos!", text: "El 12 de abril de 1961 despegó su nave espacial, la Vostok 1. Mientras se elevaba, Yuri gritó «¡Poyekhali!», que quiere decir «¡Vámonos!»." },
      { title: "Una vuelta a la Tierra", text: "Yuri dio una vuelta completa a la Tierra. El vuelo duró unos 108 minutos, y fue la primera persona que vio la Tierra desde el espacio." },
      { title: "Aterrizaje en paracaídas", text: "Casi al final, Yuri saltó de su cápsula y bajó flotando en paracaídas. Aterrizó en un campo, cerca de una campesina sorprendida y de una niña." }
    ],
    dialogue: {
      npc: { name: "Yuri Gagarin", role: "un piloto y cosmonauta, la primera persona en el espacio" },
      intro: "¡Hola, amigo! Soy Yuri. Hoy voy a volar al espacio, más alto de lo que nadie ha llegado nunca. ¿Estás listo? ¡Poyekhali! ¡Vámonos!",
      topics: [
        { ask: "¿Cómo se veía la Tierra?", answer: "¡Preciosa! Veía el borde curvo de la Tierra, con un fino brillo azul de aire a su alrededor. Los mares, las nubes, la tierra… todo era tan bonito." },
        { ask: "¿Qué es un cosmonauta?", answer: "Así llamamos en mi país a quien viaja al espacio. En Estados Unidos dicen astronauta. Las dos palabras quieren decir alguien que viaja al espacio." },
        { ask: "¿Fue difícil prepararse?", answer: "Entrenamos durante mucho tiempo: máquinas que dan vueltas, saltos en paracaídas y mucho estudio. Cuando practicas mucho, puedes mantener la calma, incluso en una gran aventura." },
        { ask: "¿Flotabas?", answer: "¡Sí! Sin sentir el peso, flotaba contra los cinturones de mi asiento. En una nave espacial, todo lo que no está sujeto se pone a flotar." },
        { ask: "¿Cómo volviste a casa?", answer: "Mi cápsula bajó atravesando el aire, y luego salté y bajé flotando con un paracaídas. Aterricé en un campo, ¡y una campesina y una niña se acercaron a saludarme!" }
      ],
      challenge: {
        q: "¿Qué gritó Yuri Gagarin cuando despegó su cohete?",
        choices: ["¡Adiós!", "¡Mírame!", "¡Poyekhali! (¡Vámonos!)"],
        explain: "Yuri gritó «¡Poyekhali!», que quiere decir «¡Vámonos!»."
      },
      farewell: "La Tierra es preciosa vista desde allá arriba. ¡Cuidémosla! Adiós, y sueña a lo grande."
    },
    timeline: {
      title: "Las primeras personas en el espacio",
      events: [
        { label: "Nace Yuri Gagarin", when: "1934" },
        { label: "Se lanza el Sputnik 1, el primer satélite", when: "1957" },
        { label: "Yuri Gagarin da una vuelta a la Tierra en la Vostok 1", when: "1961" },
        { label: "Valentina Tereshkova se convierte en la primera mujer en el espacio", when: "1963" },
        { label: "Las Naciones Unidas declaran el 12 de abril Día Internacional de los Vuelos Espaciales Tripulados", when: "2011" }
      ]
    },
    artifact: {
      name: "Una cápsula Vostok",
      text: "Las cápsulas Vostok eran redondas como una pelota, con ventanitas redondas. El cosmonauta iba sentado dentro, en un asiento especial que podía salir disparado para terminar el aterrizaje en paracaídas."
    },
    quiz: [
      { q: "¿Quién fue la primera persona que voló al espacio?", choices: ["Galileo", "Yuri Gagarin", "Neil Armstrong"], hint: "Gritó «¡Poyekhali!».", explain: "Yuri Gagarin fue la primera persona en el espacio, en 1961." },
      { q: "¿En qué año voló Yuri Gagarin al espacio?", choices: ["1961", "1969", "1957"], hint: "Cuatro años después del Sputnik.", explain: "Yuri voló al espacio el 12 de abril de 1961." },
      { q: "¿Qué quiere decir «¡Poyekhali!»?", choices: ["¡Adiós!", "¡Socorro!", "¡Vámonos!"], hint: "Lo dijo cuando despegó el cohete.", explain: "«¡Poyekhali!» quiere decir «¡Vámonos!»." },
      { q: "¿Cuántas vueltas dio Yuri a la Tierra?", choices: ["Diez vueltas", "Una", "No le dio ninguna vuelta"], hint: "Su viaje duró unos 108 minutos.", explain: "Yuri dio una vuelta a la Tierra, en unos 108 minutos." },
      { q: "¿Cómo aterrizó Yuri al final de su vuelo?", choices: ["En la Luna", "En un barco en el mar", "En paracaídas, en un campo"], hint: "Saltó de su cápsula.", explain: "Yuri saltó de su cápsula y bajó flotando en paracaídas hasta un campo." }
    ]
  },
  'h3-moon-tereshkova': {
    title: "Valentina Tereshkova, la Gaviota",
    topicName: "La primera mujer en el espacio",
    blurb: "Conoce a Valentina Tereshkova, que pasó de una fábrica de telas al espacio.",
    reading: [
      { title: "Una obrera a la que le encantaba el cielo", text: "Valentina Tereshkova trabajaba en una fábrica textil, haciendo telas. En su tiempo libre se apuntó a un club y aprendió a saltar en paracaídas." },
      { title: "Elegida para el espacio", text: "Sus saltos en paracaídas la ayudaron a ser elegida para el equipo espacial. Entrenó muchísimo con los demás cosmonautas." },
      { title: "La Gaviota vuela", text: "El 16 de junio de 1963, Valentina voló al espacio en la Vostok 6. Fue la primera mujer en el espacio. Su nombre por radio era «Chaika», que quiere decir «Gaviota»." },
      { title: "Casi tres días", text: "Dio 48 vueltas a la Tierra en casi tres días. ¡Eso era más tiempo que todos los vuelos de los astronautas estadounidenses hasta entonces juntos!" }
    ],
    dialogue: {
      npc: { name: "Valentina Tereshkova", role: "una cosmonauta, la primera mujer en el espacio" },
      intro: "¡Hola! Soy Valentina. Mi nombre por radio es Chaika, la Gaviota. ¡Hoy vuelo al espacio! ¿Quieres ser mi control de tierra?",
      topics: [
        { ask: "¿Cómo te hiciste cosmonauta?", answer: "Trabajaba en una fábrica haciendo telas, y me encantaba saltar en paracaídas en mi club. Cuando buscaron gente para entrenar para el espacio, ¡mis saltos en paracaídas me ayudaron a que me eligieran!" },
        { ask: "¿Por qué te llamas Gaviota?", answer: "Cada cosmonauta tiene un nombre por radio. El mío es Chaika, la Gaviota. Cuando decía «¡Aquí Gaviota!», todos en tierra sabían que era yo." },
        { ask: "¿Qué hiciste en el espacio?", answer: "Cuidé de mi nave, hice fotos del borde de la Tierra y anoté cómo se sentía mi cuerpo. Los científicos querían saber cómo se las arreglan las personas en el espacio durante varios días." },
        { ask: "¿Cuánto tiempo estuviste allá arriba?", answer: "¡Casi tres días! Di 48 vueltas a la Tierra, y también dormí y comí en el espacio." },
        { ask: "¿Qué les dirías a los niños a los que les encanta el espacio?", answer: "Estudia, entrena y sé valiente. ¡El cielo es para todos!" }
      ],
      challenge: {
        q: "¿Cuál era el nombre por radio de Valentina?",
        choices: ["Águila", "Gaviota", "Halcón"],
        explain: "Su nombre por radio era Chaika, que quiere decir Gaviota."
      },
      farewell: "¡Aquí Gaviota, cambio y corto! Sigue soñando con las estrellas."
    },
    timeline: {
      title: "Las mujeres en el espacio",
      events: [
        { label: "Nace Valentina Tereshkova", when: "1937" },
        { label: "Valentina se convierte en la primera mujer en el espacio", when: "1963" },
        { label: "Sally Ride se convierte en la primera mujer estadounidense en el espacio", when: "1983" },
        { label: "Svetlana Savitskaya se convierte en la primera mujer que camina por el espacio", when: "1984" },
        { label: "Yi So-yeon se convierte en la primera persona coreana en el espacio", when: "2008" }
      ]
    },
    artifact: {
      name: "El casco de una cosmonauta",
      text: "Los primeros cosmonautas llevaban un casco redondo y duro, con una ventana delante que se podía cerrar. Formaba parte de un traje que podía protegerlos si alguna vez se escapaba el aire de la cabina."
    },
    quiz: [
      { q: "¿Quién fue la primera mujer en el espacio?", choices: ["Valentina Tereshkova", "Sally Ride", "Katherine Johnson"], hint: "Su nombre por radio era Gaviota.", explain: "Valentina Tereshkova fue la primera mujer en el espacio, en 1963." },
      { q: "¿Qué afición ayudó a que eligieran a Valentina?", choices: ["Pintar", "Nadar", "Saltar en paracaídas"], hint: "Saltaba de aviones en su club.", explain: "Sus saltos en paracaídas la ayudaron a ser elegida para el equipo espacial." },
      { q: "¿Qué quiere decir «Chaika»?", choices: ["Gaviota", "Cohete", "Estrella"], hint: "Es un pájaro.", explain: "Chaika quiere decir Gaviota." },
      { q: "¿Cuánto tiempo estuvo Valentina en el espacio, más o menos?", choices: ["Una hora", "Casi tres días", "Un año entero"], hint: "Dio 48 vueltas a la Tierra.", explain: "Estuvo en el espacio casi tres días." },
      { q: "¿Dónde trabajaba Valentina antes de ser cosmonauta?", choices: ["En una panadería", "En una fábrica textil, haciendo telas", "En un barco"], hint: "Hacía telas.", explain: "Valentina trabajaba en una fábrica textil, haciendo telas." }
    ]
  },

  // ── Base lunar 4: Valle de la Antena ──
  'h4-moon-katherine-johnson': {
    title: "Katherine Johnson revisa los números",
    topicName: "Katherine Johnson y las matemáticas del espacio",
    blurb: "Calcula las trayectorias de las naves espaciales con Katherine Johnson, la matemática en la que confiaban los astronautas.",
    reading: [
      { title: "Una niña que lo contaba todo", text: "A Katherine Johnson le encantaban los números. ¡De pequeña contaba escalones, platos y estrellas! Era tan rápida que empezó el instituto con solo 10 años." },
      { title: "Computadoras humanas", text: "Antes de las computadoras modernas, a las personas que hacían cálculos difíciles a mano las llamaban «computadoras». En la NASA, Katherine calculaba las trayectorias que iban a seguir las naves espaciales." },
      { title: "¡Revisa los números!", text: "En 1962, el astronauta John Glenn iba a dar vueltas a la Tierra. Unas computadoras electrónicas habían calculado su trayectoria, ¡pero él pidió que antes Katherine revisara los números a mano!" },
      { title: "A la Luna y de vuelta", text: "Katherine también ayudó a calcular las trayectorias de los viajes del Apolo a la Luna. En 2015 recibió la Medalla Presidencial de la Libertad, uno de los mayores honores de Estados Unidos." }
    ],
    dialogue: {
      npc: { name: "Katherine Johnson", role: "una matemática de la NASA" },
      intro: "¡Hola! Soy Katherine. Me encantan los números, y hoy estoy revisando la trayectoria del viaje de un astronauta alrededor de la Tierra. ¿Me ayudas a contar?",
      topics: [
        { ask: "¿En qué consiste tu trabajo?", answer: "Calculo las trayectorias que siguen las naves espaciales: por dónde suben, cómo dan vueltas a la Tierra y dónde exactamente van a bajar. Cada número tiene que estar perfecto." },
        { ask: "¿Por qué John Glenn preguntó por ti?", answer: "Las computadoras electrónicas eran muy rápidas, pero eran nuevas, y la gente todavía no se fiaba del todo de ellas. John Glenn dijo: «Que la chica revise los números». Cuando mis números coincidieron, ¡ya estaba listo para salir!" },
        { ask: "¿Fue siempre fácil?", answer: "No siempre. En aquella época, a las personas negras y a las blancas las separaban injustamente, y al principio yo trabajaba en un grupo aparte. Pero hacía preguntas, hablaba en las reuniones, y nuestro trabajo cuidadoso ayudó a enviar personas al espacio." },
        { ask: "¿Ayudaste con la Luna?", answer: "¡Sí! Ayudé a calcular las trayectorias de los viajes del Apolo a la Luna y de vuelta, para que el módulo lunar pudiera reunirse otra vez con la nave principal y los astronautas pudieran volver a casa." },
        { ask: "¿Qué consejo nos das?", answer: "Que te guste lo que haces y que lo hagas lo mejor que puedas. ¡Y revisa siempre tu trabajo!" }
      ],
      challenge: {
        q: "¿Qué le pidió John Glenn a Katherine antes de su vuelo?",
        choices: ["Que condujera el cohete", "Que revisara a mano los números de la computadora", "Que pintara su nave espacial"],
        explain: "Pidió que Katherine revisara a mano los números de la computadora. Cuando coincidieron, estuvo listo para volar."
      },
      farewell: "¡Sigue contando, sigue haciendo preguntas y revisa siempre tu trabajo!"
    },
    timeline: {
      title: "La vida de Katherine Johnson",
      events: [
        { label: "Katherine Johnson nace en Virginia Occidental, Estados Unidos", when: "1918" },
        { label: "Katherine empieza a trabajar como matemática en el NACA, que más tarde se convierte en la NASA", when: "1953" },
        { label: "Katherine revisa los números del vuelo de John Glenn alrededor de la Tierra", when: "1962" },
        { label: "El Apolo 11 aterriza en la Luna, siguiendo una trayectoria que Katherine ayudó a calcular", when: "1969" },
        { label: "Katherine recibe la Medalla Presidencial de la Libertad", when: "2015" }
      ]
    },
    artifact: {
      name: "Una regla de cálculo",
      text: "Antes de las calculadoras de bolsillo, los ingenieros y los matemáticos solían usar reglas de cálculo: reglas que se deslizan una sobre otra para multiplicar y dividir deprisa. Muchos cálculos difíciles también se hacían con calculadoras mecánicas de escritorio, o con lápiz y papel."
    },
    quiz: [
      { q: "¿Cuál era el trabajo de Katherine Johnson en la NASA?", choices: ["Calcular las trayectorias de las naves espaciales", "Cocinar para los astronautas", "Construir cohetes con un martillo"], hint: "Era matemática.", explain: "Katherine calculaba las trayectorias que iban a seguir las naves espaciales." },
      { q: "Hace mucho tiempo, ¿qué eran las «computadoras»?", choices: ["Robots", "Personas que hacían cálculos difíciles a mano", "Telescopios"], hint: "Antes de las computadoras electrónicas…", explain: "Antes de las computadoras modernas, a las personas que hacían cálculos difíciles a mano las llamaban «computadoras»." },
      { q: "¿Qué astronauta pidió que Katherine revisara los números?", choices: ["Yuri Gagarin", "Sally Ride", "John Glenn"], hint: "Dio vueltas a la Tierra en 1962.", explain: "John Glenn pidió que Katherine revisara los números antes de su vuelo en 1962." },
      { q: "¿Cuántos años tenía Katherine cuando empezó el instituto?", choices: ["10", "14", "18"], hint: "Era muy pequeña.", explain: "Era tan rápida con los números que empezó el instituto con solo 10 años." },
      { q: "¿Cuál es el mejor consejo de Katherine para las matemáticas?", choices: ["Ir siempre con prisa", "No hacer nunca preguntas", "Revisar siempre tu trabajo"], hint: "Ella revisó los números de John Glenn.", explain: "Katherine siempre decía que hay que revisar el trabajo." }
    ]
  },
  'h4-moon-apollo11-crew': {
    title: "Apolo 11: tres amigos rumbo a la Luna",
    topicName: "El Apolo 11",
    blurb: "Da vueltas a la Luna con Michael Collins mientras Neil Armstrong y Buzz Aldrin caminan por ella.",
    reading: [
      { title: "Tres astronautas", text: "En julio de 1969, tres astronautas salieron rumbo a la Luna en el Apolo 11: Neil Armstrong, Buzz Aldrin y Michael Collins." },
      { title: "El Águila ha aterrizado", text: "El 20 de julio de 1969, Neil y Buzz aterrizaron en la Luna en un pequeño módulo lunar llamado el Águila. Neil fue la primera persona que pisó la Luna." },
      { title: "El Columbia da vueltas", text: "Michael se quedó en la nave principal, el Columbia, dando vueltas y vueltas alrededor de la Luna. Tenía que estar listo para recoger a sus amigos cuando volvieran a subir." },
      { title: "Rocas lunares y una placa", text: "Neil y Buzz recogieron unos 22 kilos de rocas y polvo lunar. Dejaron una placa que dice que «vinimos en paz en nombre de toda la humanidad»." }
    ],
    dialogue: {
      npc: { name: "Michael Collins", role: "un astronauta del Apolo 11 que pilotó la nave principal alrededor de la Luna" },
      intro: "¡Hola, ahí arriba! Soy Michael Collins. Mis amigos Neil y Buzz están ahora mismo en la Luna, y yo doy vueltas a su alrededor en nuestra nave, el Columbia. ¡Ven a hacerme compañía!",
      topics: [
        { ask: "¿Por qué tú no caminaste por la Luna?", answer: "Alguien tenía que pilotar el Columbia y estar listo para llevar a todos a casa. Ese era mi trabajo, y era muy importante. ¡Sin él, nadie habría podido volver!" },
        { ask: "¿Te sentías solo?", answer: "¡La verdad es que no! Estaba ocupado, y me sentía feliz y orgulloso. Cuando pasaba por detrás de la Luna, no podía hablar con la Tierra durante un rato, así que todo estaba muy tranquilo. Y tenía la mejor vista que existe." },
        { ask: "¿Qué dijo Neil en la Luna?", answer: "Al bajar, Neil dijo: «Es un pequeño paso para el hombre, pero un gran salto para la humanidad». Millones de personas lo oyeron por la televisión y la radio." },
        { ask: "¿Qué hicieron en la Luna?", answer: "Prepararon experimentos, hicieron fotos, clavaron una bandera y recogieron rocas lunares para que los científicos las estudiaran. Pasaron unas dos horas y media caminando fuera." },
        { ask: "¿Cómo volvieron todos a casa?", answer: "El Águila volvió a subir y se unió al Columbia. Después, los tres volamos de vuelta a la Tierra y caímos sanos y salvos en el océano Pacífico. ¡Chof!" }
      ],
      challenge: {
        q: "¿Cuál era el trabajo de Michael Collins durante el alunizaje?",
        choices: ["Conducir un róver lunar", "Preparar la cena en la Luna", "Pilotar el Columbia alrededor de la Luna"],
        explain: "Michael pilotaba la nave principal, el Columbia, alrededor de la Luna, listo para recoger a Neil y a Buzz."
      },
      farewell: "Pronto estaremos en casa. Mira la Luna esta noche y recuerda: ¡tres amigos fueron allí juntos!"
    },
    timeline: {
      title: "El camino hacia la Luna",
      events: [
        { label: "Yuri Gagarin se convierte en la primera persona en el espacio", when: "1961" },
        { label: "La tripulación del Apolo 8 es la primera que da vueltas alrededor de la Luna", when: "1968" },
        { label: "El Apolo 11 aterriza, y Neil Armstrong y Buzz Aldrin caminan por la Luna", when: "1969" },
        { label: "Aterriza el Apolo 17, el último viaje del Apolo a la Luna", when: "1972" }
      ]
    },
    artifact: {
      name: "Una roca lunar",
      text: "Los astronautas del Apolo trajeron unos 382 kilos de rocas y polvo lunar. Los científicos todavía los estudian hoy, ¡y en algunos museos hasta puedes tocar un trocito de la Luna!"
    },
    quiz: [
      { q: "¿Quién fue la primera persona que pisó la Luna?", choices: ["Neil Armstrong", "Michael Collins", "Yuri Gagarin"], hint: "Dijo «un pequeño paso».", explain: "Neil Armstrong fue la primera persona que pisó la Luna, en 1969." },
      { q: "¿Cómo se llamaba el módulo que llevó a Neil y a Buzz a la Luna?", choices: ["Columbia", "El Águila", "Sputnik"], hint: "Es un pájaro.", explain: "Su módulo lunar se llamaba el Águila. «¡El Águila ha aterrizado!»" },
      { q: "¿En qué año aterrizó el Apolo 11 en la Luna?", choices: ["1961", "1972", "1969"], hint: "Al final de los años sesenta.", explain: "El Apolo 11 aterrizó en la Luna el 20 de julio de 1969." },
      { q: "¿Dónde cayeron los astronautas del Apolo 11 al volver a casa?", choices: ["En el océano Pacífico", "En una pista de aterrizaje", "En un desierto"], hint: "¡Chof!", explain: "Cayeron sanos y salvos en el océano Pacífico." },
      { q: "¿Qué trajeron los astronautas de la Luna?", choices: ["Agua lunar", "Rocas y polvo lunar", "Un conejo lunar"], hint: "Los científicos todavía los estudian.", explain: "Trajeron rocas y polvo lunar para que los científicos los estudiaran." }
    ]
  },

  // ── Base lunar 5: Cráter del Invernadero ──
  'h5-moon-hubble': {
    title: "El Hubble, el telescopio espacial",
    topicName: "Los telescopios espaciales",
    blurb: "Conoce a Nancy Grace Roman, que ayudó a planear un telescopio por encima del aire.",
    reading: [
      { title: "Por encima del aire que tiembla", text: "El aire que rodea la Tierra tiembla y emborrona la luz de las estrellas. ¡Por eso las estrellas titilan! Un telescopio en el espacio puede ver mucho más claro." },
      { title: "La madre del Hubble", text: "Nancy Grace Roman fue la primera jefa de astronomía de la NASA. Trabajó durante años para planear un gran telescopio en el espacio, y la gente la llama «la madre del Hubble»." },
      { title: "Un comienzo borroso", text: "El Hubble subió al espacio en 1990, pero sus imágenes salían borrosas porque su gran espejo tenía una forma equivocada por una diferencia diminuta. En 1993, unos astronautas subieron a arreglarlo. ¡Fue como ponerle gafas (o anteojos)!" },
      { title: "Imágenes increíbles", text: "Desde entonces, el Hubble ha hecho imágenes preciosas de galaxias lejanas y ha ayudado a los científicos a calcular la edad del universo." }
    ],
    dialogue: {
      npc: { name: "Nancy Grace Roman", role: "una astrónoma, la primera jefa de astronomía de la NASA" },
      intro: "¡Hola! Soy Nancy. Cuando era niña, hacía mapas de estrellas con mis amigas. Ahora estoy planeando algo muy grande: ¡un telescopio que flota por encima del aire!",
      topics: [
        { ask: "¿Por qué poner un telescopio en el espacio?", answer: "Nuestro aire es estupendo para respirar, pero emborrona la luz de las estrellas y bloquea por completo algunos tipos de luz. Por encima del aire, un telescopio puede ver claro todo el tiempo." },
        { ask: "¿Cuándo empezaron a encantarte las estrellas?", answer: "Cuando tenía unos once años, fundé un club de astronomía con mis amigas. En las noches despejadas aprendíamos juntas las constelaciones." },
        { ask: "¿Fue fácil llegar a ser astrónoma?", answer: "¡No siempre! Algunas personas me decían que las chicas no debían estudiar ciencias ni matemáticas. Pero a mí me encantaban, así que seguí adelante." },
        { ask: "¿Por qué se llama Hubble?", answer: "Se llama así por Edwin Hubble, un astrónomo que descubrió que hay muchas galaxias más allá de la nuestra, y que el universo se está haciendo más grande." },
        { ask: "¿Qué puede ver el Hubble?", answer: "Galaxias muy, muy lejanas, estrellas nuevas que nacen en nubes de gas y planetas de nuestro propio sistema solar. ¡Da una vuelta a la Tierra más o menos cada 95 minutos!" }
      ],
      challenge: {
        q: "¿Por qué un telescopio en el espacio ve más claro que uno en el suelo?",
        choices: ["Está más cerca de la Luna", "Está por encima del aire que emborrona", "Tiene un tubo más largo"],
        explain: "Allá arriba, en el espacio, no hay aire tembloroso que emborrone la luz de las estrellas."
      },
      farewell: "Sigue mirando al cielo y haciendo preguntas. ¡El universo está lleno de sorpresas!"
    },
    timeline: {
      title: "Telescopios en el espacio",
      events: [
        { label: "Nace Nancy Grace Roman", when: "1925" },
        { label: "Nancy se convierte en la primera jefa de astronomía de la NASA", when: "1959" },
        { label: "Se lanza el telescopio espacial Hubble", when: "1990" },
        { label: "Unos astronautas arreglan la vista borrosa del Hubble", when: "1993" },
        { label: "Se lanza el telescopio espacial James Webb", when: "2021" }
      ]
    },
    artifact: {
      name: "Una maqueta del telescopio espacial Hubble",
      text: "El Hubble es más o menos tan largo como un autobús escolar. Dentro tiene un gran espejo curvo de unos 2,4 metros de ancho, y unos paneles solares como alas para producir electricidad con la luz del sol."
    },
    quiz: [
      { q: "¿Por qué titilan las estrellas cuando las miramos desde el suelo?", choices: ["Se encienden y se apagan", "El aire que rodea la Tierra hace temblar su luz", "La Luna se pone en medio"], hint: "Algo que está entre nosotros y las estrellas.", explain: "El aire en movimiento que rodea la Tierra hace temblar y emborrona la luz de las estrellas, así que las estrellas titilan." },
      { q: "¿A quién llaman «la madre del Hubble»?", choices: ["A Nancy Grace Roman", "A Valentina Tereshkova", "A Katherine Johnson"], hint: "Fue la primera jefa de astronomía de la NASA.", explain: "Nancy Grace Roman trabajó durante años para planear el Hubble, por eso la llaman su madre." },
      { q: "¿Qué le pasaba al Hubble al principio?", choices: ["No tenía energía", "Estaba boca abajo", "Sus imágenes salían borrosas"], hint: "Necesitaba «gafas».", explain: "Su espejo tenía una forma equivocada por una diferencia diminuta, así que sus imágenes salieron borrosas hasta 1993." },
      { q: "¿Quién arregló el Hubble en 1993?", choices: ["Robots de la Luna", "Unos astronautas que subieron hasta él", "Nadie pudo arreglarlo"], hint: "Unas personas subieron al espacio.", explain: "Unos astronautas subieron hasta el Hubble y lo arreglaron. ¡Fue como ponerle gafas!" },
      { q: "El Hubble se llama así por Edwin Hubble. ¿Qué descubrió él?", choices: ["Que hay muchas galaxias más allá de la nuestra", "Que la Luna tiene un conejo", "Cómo construir cohetes"], hint: "Galaxias…", explain: "Edwin Hubble descubrió que hay muchas galaxias más allá de nuestra Vía Láctea, y que el universo está creciendo." }
    ]
  },
  'h5-moon-space-station': {
    title: "Un hogar en órbita: la estación espacial",
    topicName: "La Estación Espacial Internacional",
    blurb: "Flota por la Estación Espacial Internacional con una astronauta que vive allí.",
    reading: [
      { title: "Una casa en el espacio", text: "La Estación Espacial Internacional, o EEI, es una gran casa y un laboratorio que da vueltas alrededor de la Tierra. Allí viven y trabajan juntos astronautas de muchos países." },
      { title: "Construida pieza a pieza", text: "Se construyó en el espacio, pieza a pieza, a partir de 1998. Cohetes y transbordadores espaciales subieron las piezas, y los astronautas las fueron uniendo." },
      { title: "Dieciséis amaneceres", text: "La EEI da una vuelta a la Tierra más o menos cada 90 minutos, así que los astronautas que van a bordo ven unos 16 amaneceres y 16 atardeceres cada día." },
      { title: "Siempre hay alguien en casa", text: "Desde el año 2000 siempre ha vivido gente en la EEI. En 2008, Yi So-yeon la visitó y se convirtió en la primera persona coreana en el espacio." }
    ],
    dialogue: {
      npc: { name: "Comandante Ana", role: "una astronauta que vive en la estación espacial" },
      intro: "¡Bienvenido a bordo de la estación espacial! Soy la comandante Ana. Agárrate a esta barandilla, ¡o te irás flotando! Deja que te enseñe todo esto.",
      topics: [
        { ask: "¿Cómo duermes?", answer: "¡En un saquito de dormir atado a la pared! Aquí no hay arriba ni abajo, así que puedo dormir de pie, boca abajo o de lado. Es muy acogedor." },
        { ask: "¿Cómo comes?", answer: "Nuestra comida viene en bolsitas y latas, y a una parte le añadimos agua. Las migas saldrían flotando y se meterían en las máquinas, ¡así que comemos tortillas de trigo en vez de pan!" },
        { ask: "¿Quién vive aquí?", answer: "Astronautas de muchos países: Estados Unidos, Rusia, Japón, Canadá, países de Europa y más. Todos trabajamos juntos como un solo equipo." },
        { ask: "¿Qué haces todo el día?", answer: "¡Experimentos científicos! Cultivamos plantas, estudiamos cómo cambia nuestro cuerpo en el espacio y observamos la Tierra. También hacemos unas dos horas de ejercicio al día para mantener fuertes los músculos y los huesos." },
        { ask: "¿Qué es lo mejor de todo?", answer: "¡Las vistas! Por nuestra gran ventana redonda veo tormentas, ciudades que brillan de noche, y luces verdes y rojas que bailan sobre los polos: las auroras." }
      ],
      challenge: {
        q: "¿Por qué los astronautas de la EEI comen tortillas de trigo en vez de pan?",
        choices: ["Las tortillas saben a espacio", "Las migas de pan saldrían flotando por todas partes", "En la Tierra no hay pan"],
        explain: "El pan suelta migas, y en el espacio las migas salen flotando y se meten en las máquinas. Las tortillas no se desmigan."
      },
      farewell: "¡Me toca hacer ejercicio! La próxima vez que veas un punto brillante deslizándose por el cielo de noche, salúdalo. ¡Puede que seamos nosotros!"
    },
    timeline: {
      title: "Hogares en el espacio",
      events: [
        { label: "La Salyut 1, la primera estación espacial, da vueltas alrededor de la Tierra", when: "1971" },
        { label: "Se lanza la primera parte de la estación espacial Mir", when: "1986" },
        { label: "Se lanza la primera parte de la Estación Espacial Internacional", when: "1998" },
        { label: "Empieza a vivir gente en la EEI todo el tiempo", when: "2000" },
        { label: "China termina de construir su estación espacial Tiangong", when: "2022" }
      ]
    },
    artifact: {
      name: "Una maqueta de la EEI",
      text: "La EEI es más o menos tan grande como un campo de fútbol, con largas filas de paneles solares. Sus habitaciones, llamadas módulos, están unidas como piezas de construcción: unas para vivir, otras para trabajar y otras para hacer experimentos."
    },
    quiz: [
      { q: "¿Qué es la EEI?", choices: ["Un róver lunar", "Una casa y un laboratorio que da vueltas alrededor de la Tierra", "Un telescopio en una montaña"], hint: "Allí viven astronautas.", explain: "La Estación Espacial Internacional es una casa y un laboratorio que da vueltas alrededor de la Tierra." },
      { q: "¿Cuántos amaneceres ven cada día, más o menos, los astronautas de la EEI?", choices: ["1", "16", "100"], hint: "Da una vuelta a la Tierra más o menos cada 90 minutos.", explain: "Como dan una vuelta cada 90 minutos, más o menos, ven unos 16 amaneceres al día." },
      { q: "¿Cómo duermen los astronautas en la EEI?", choices: ["En sacos de dormir atados a la pared", "En camas con mantas pesadas", "No duermen nunca"], hint: "Si no, irían flotando por ahí.", explain: "Duermen en sacos de dormir atados a la pared, para no ir flotando por ahí." },
      { q: "¿Quién se convirtió en 2008 en la primera persona coreana en el espacio?", choices: ["Yi So-yeon", "Sally Ride", "Yuri Gagarin"], hint: "Visitó la EEI.", explain: "Yi So-yeon visitó la EEI en 2008 y se convirtió en la primera persona coreana en el espacio." },
      { q: "¿Por qué los astronautas hacen unas dos horas de ejercicio al día?", choices: ["Para ganar carreras", "Para no pasar frío", "Para mantener fuertes los músculos y los huesos"], hint: "Al flotar casi no usas los músculos.", explain: "Flotar debilita los músculos y los huesos, así que el ejercicio diario los mantiene fuertes." }
    ]
  },

  // ── Base lunar 6: Cuevas de Cristal ──
  'h6-moon-sally-ride': {
    title: "Sally Ride alcanza las estrellas",
    topicName: "Sally Ride y el transbordador espacial",
    blurb: "Vuela en el transbordador espacial con Sally Ride, científica, astronauta y profesora.",
    reading: [
      { title: "Tenis y física", text: "A Sally Ride le encantaban la ciencia y el tenis. En la universidad estudió física, la ciencia de cómo se mueven las cosas, y llegó a ser la doctora Ride." },
      { title: "Elegida como astronauta", text: "En 1978, la NASA eligió a Sally para entrenarse como astronauta. Ayudó a desarrollar un brazo robótico para el transbordador espacial." },
      { title: "La primera mujer estadounidense en el espacio", text: "En junio de 1983, Sally voló en el transbordador espacial y se convirtió en la primera mujer estadounidense en el espacio. Usó el brazo robótico para soltar un satélite en el espacio y volver a atraparlo." },
      { title: "Ciencia para todos los niños", text: "Más tarde, Sally escribió libros de ciencia para niños y fundó una empresa para ayudar a niñas y niños a disfrutar de la ciencia." }
    ],
    dialogue: {
      npc: { name: "Sally Ride", role: "una astronauta y física" },
      intro: "¡Hola! Soy Sally. Pronto voy a volar en el transbordador espacial, y voy a usar el brazo robótico en el que ayudé a trabajar. ¿Quieres que te cuente cómo funciona?",
      topics: [
        { ask: "¿Qué es el transbordador espacial?", answer: "¡Es una nave espacial con alas! Despega como un cohete, da vueltas a la Tierra y luego baja planeando para aterrizar en una pista, como un avión." },
        { ask: "¿Qué hace el brazo robótico?", answer: "Es un brazo largo con articulaciones como tu hombro, tu codo y tu muñeca. Lo usamos para sacar satélites del transbordador al espacio, ¡y hasta para volver a atraparlos!" },
        { ask: "¿Cómo fue el despegue?", answer: "¡Ruidoso, con mucho temblor y emocionantísimo! Después dije que era lo más divertido que haría en mi vida. Fui sonriendo todo el camino." },
        { ask: "¿Te hacía la gente preguntas raras?", answer: "¡Algunos periodistas me preguntaron si el espacio me haría llorar, o qué maquillaje me iba a llevar! Les dije que iba como científica, igual que el resto de la tripulación." },
        { ask: "¿Quién vino después de ti?", answer: "¡Muchísima gente brillante! En 1992, Mae Jemison, médica e ingeniera, se convirtió en la primera mujer afroamericana en el espacio. El espacio es para todos." }
      ],
      challenge: {
        q: "¿Para qué usó Sally el brazo robótico del transbordador?",
        choices: ["Para cocinar", "Para soltar y atrapar un satélite", "Para jugar al tenis en el espacio"],
        explain: "Sally usó el brazo robótico para soltar un satélite en el espacio y volver a atraparlo."
      },
      farewell: "¡Alcanza las estrellas, y no dejes nunca que nadie te diga que la ciencia no es para ti!"
    },
    timeline: {
      title: "Sally Ride y el transbordador espacial",
      events: [
        { label: "Sally Ride nace en California", when: "1951" },
        { label: "La NASA elige a Sally para entrenarse como astronauta", when: "1978" },
        { label: "Vuela el primer transbordador espacial", when: "1981" },
        { label: "Sally se convierte en la primera mujer estadounidense en el espacio", when: "1983" },
        { label: "Mae Jemison se convierte en la primera mujer afroamericana en el espacio", when: "1992" },
        { label: "Los transbordadores espaciales hacen su último vuelo", when: "2011" }
      ]
    },
    artifact: {
      name: "Una maqueta del transbordador espacial",
      text: "El transbordador espacial tenía alas y una gran bodega de carga con puertas que se abrían en el espacio. Despegaba con un enorme depósito de combustible naranja y dos cohetes propulsores blancos, y volvía a casa aterrizando en una pista."
    },
    quiz: [
      { q: "¿Quién fue la primera mujer estadounidense en el espacio?", choices: ["Sally Ride", "Nancy Grace Roman", "Mae Jemison"], hint: "Usó el brazo robótico.", explain: "Sally Ride se convirtió en la primera mujer estadounidense en el espacio en 1983." },
      { q: "¿Qué tenía de especial el transbordador espacial?", choices: ["Solo podía ir a la Luna", "Tenía alas y aterrizaba en una pista", "Lo tiraban caballos"], hint: "Volvía a casa planeando como un avión.", explain: "El transbordador tenía alas, así que podía volver planeando y aterrizar en una pista." },
      { q: "¿Qué estudió Sally en la universidad?", choices: ["Cocina", "Música", "Física"], hint: "La ciencia de cómo se mueven las cosas.", explain: "Sally estudió física, la ciencia de cómo se mueven las cosas." },
      { q: "¿Quién se convirtió en 1992 en la primera mujer afroamericana en el espacio?", choices: ["Mae Jemison", "Katherine Johnson", "Valentina Tereshkova"], hint: "Era médica e ingeniera.", explain: "Mae Jemison voló en 1992: fue la primera mujer afroamericana en el espacio." },
      { q: "¿Qué hizo Sally más tarde para ayudar a los niños?", choices: ["Construyó un parque de atracciones", "Escribió libros de ciencia y ayudó a los niños a disfrutar de la ciencia", "Abrió una tienda de tenis"], hint: "Libros y ciencia.", explain: "Sally escribió libros de ciencia para niños y fundó una empresa para ayudarlos a disfrutar de la ciencia." }
    ]
  },
  'h6-moon-change': {
    title: "Chang'e y los róveres Conejo de Jade",
    topicName: "Las misiones lunares de China",
    blurb: "Conduce los róveres Conejo de Jade con una ingeniera de la misión, desde la cara visible hasta la cara oculta de la Luna.",
    reading: [
      { title: "Con nombres de leyenda", text: "China puso a sus misiones lunares el nombre de Chang'e, la dama de la Luna del cuento antiguo, y a sus róveres lunares el de su Conejo de Jade: Yutu." },
      { title: "El primer róver", text: "En 2013, la Chang'e 3 aterrizó y el róver Yutu salió rodando por la Luna. Yutu envió fotos y estudió el suelo que tenía bajo las ruedas." },
      { title: "La cara oculta", text: "En 2019, la Chang'e 4 fue la primera nave espacial que se posó suavemente en la cara oculta de la Luna, la que nunca vemos desde la Tierra. Su róver era el Yutu-2." },
      { title: "Rocas para casa", text: "La Chang'e 5 trajo rocas lunares a la Tierra en 2020, y la Chang'e 6 trajo en 2024 las primeras rocas de la cara oculta." }
    ],
    dialogue: {
      npc: { name: "Lin", role: "una conductora de róveres en el centro de control de la misión" },
      intro: "¡Hola! Soy Lin, y conduzco un róver en la Luna desde aquí mismo, en la Tierra. ¿Me ayudas a dirigirlo? Despacito, ¡que hay un cráter delante!",
      topics: [
        { ask: "¿Cómo se conduce un róver desde la Tierra?", answer: "Miramos las fotos que nos envía el róver, planeamos un camino seguro y le mandamos las órdenes por radio. Luego el róver avanza un poquito y espera nuestro siguiente mensaje." },
        { ask: "¿Por qué va el róver tan despacio?", answer: "¡Lo primero es la seguridad! El suelo está lleno de rocas y cráteres, y si el róver se queda atascado, nadie puede ir a darle un empujón. Despacio y con cuidado se llega más lejos." },
        { ask: "¿Cómo se habla con la cara oculta?", answer: "La cara oculta siempre mira hacia el lado contrario a la Tierra, así que nuestra radio no puede llegar directamente. Por eso enviamos un satélite de enlace llamado Queqiao, el «Puente de las Urracas», para que pase los mensajes." },
        { ask: "¿Qué pasa por la noche?", answer: "Una noche en la Luna dura unas dos semanas y hace un frío helador. El róver se pliega, se va a dormir y espera a que vuelva el Sol y lo despierte." },
        { ask: "¿Para qué traer rocas lunares a casa?", answer: "En los laboratorios de la Tierra, los científicos pueden estudiar las rocas con máquinas enormes, demasiado grandes para enviarlas a la Luna. Cada roca cuenta una parte de la historia de la Luna." }
      ],
      challenge: {
        q: "¿En qué cara de la Luna aterrizó la Chang'e 4?",
        choices: ["En la cara visible", "En la cara oculta", "Aterrizó en el Sol"],
        explain: "La Chang'e 4 fue la primera nave espacial que se posó suavemente en la cara oculta, la que nunca vemos desde la Tierra."
      },
      farewell: "El róver se va a dormir durante la larga noche lunar. ¡Buenas noches, pequeño Conejo de Jade!"
    },
    timeline: {
      title: "Las misiones lunares de China",
      events: [
        { label: "La Chang'e 1 da vueltas alrededor de la Luna y hace mapas de ella", when: "2007" },
        { label: "Aterriza la Chang'e 3, y el róver Yutu recorre la Luna", when: "2013" },
        { label: "Se lanza el satélite de enlace Queqiao", when: "2018" },
        { label: "La Chang'e 4 aterriza en la cara oculta de la Luna", when: "2019" },
        { label: "La Chang'e 5 trae rocas lunares a la Tierra", when: "2020" },
        { label: "La Chang'e 6 trae las primeras rocas de la cara oculta", when: "2024" }
      ]
    },
    artifact: {
      name: "Una maqueta del róver Yutu-2",
      text: "El Yutu-2 es un róver pequeño de seis ruedas, con paneles solares como alas y cámaras en un mástil. Pesa unos 140 kilos y avanza muy despacio y con mucho cuidado."
    },
    quiz: [
      { q: "¿Qué quiere decir el nombre Yutu?", choices: ["Coche rápido", "Conejo de Jade", "Roca lunar"], hint: "Viene del antiguo cuento de la Luna.", explain: "Yutu quiere decir Conejo de Jade, el compañero de Chang'e en el antiguo cuento." },
      { q: "¿Qué tuvo de especial la Chang'e 4?", choices: ["Fue la primera que se posó suavemente en la cara oculta de la Luna", "Llevaba personas", "Fue a Marte"], hint: "La cara que nunca vemos.", explain: "En 2019, la Chang'e 4 fue la primera nave espacial que se posó suavemente en la cara oculta." },
      { q: "¿Por qué la misión a la cara oculta necesitaba el satélite de enlace Queqiao?", choices: ["Para hacerse selfis", "Para llevar combustible", "La radio de la Tierra no llega directamente a la cara oculta"], hint: "La cara oculta siempre mira hacia el otro lado.", explain: "La cara oculta mira hacia el lado contrario a la Tierra, así que Queqiao pasaba los mensajes de radio." },
      { q: "¿Qué hace un róver durante la larga y fría noche lunar?", choices: ["Conduce más deprisa", "Se va a dormir hasta que vuelve el Sol", "Vuela a casa"], hint: "No hay luz para sus paneles solares.", explain: "El róver duerme durante la noche de dos semanas y se despierta cuando vuelve el Sol." },
      { q: "¿Qué misión trajo las primeras rocas de la cara oculta?", choices: ["Chang'e 6", "Apolo 11", "Chang'e 1"], hint: "Aterrizó en 2024.", explain: "La Chang'e 6 trajo en 2024 las primeras rocas de la cara oculta." }
    ]
  },

  // ── Base lunar 7: Estación Luz de Estrellas ──
  'h7-moon-apollo13': {
    title: "Apolo 13: todos volvieron a casa",
    topicName: "El Apolo 13 y cómo resolver problemas",
    blurb: "Resuelve problemas con el Control de Misión y trae a tres astronautas sanos y salvos a casa.",
    reading: [
      { title: "Un viaje a la Luna", text: "En abril de 1970, el Apolo 13 salió rumbo a la Luna con tres astronautas: Jim Lovell, Jack Swigert y Fred Haise." },
      { title: "Cambio de planes", text: "Por el camino, se rompió un tanque de oxígeno de su nave. Ya no podían aterrizar en la Luna, así que el nuevo plan era sencillo: traer a todos a casa sanos y salvos." },
      { title: "Un módulo lunar que se convierte en bote salvavidas", text: "La tripulación se pasó a su pequeño módulo lunar, el Aquarius, y lo usó como un bote salvavidas. El Control de Misión calculó cómo rodear la Luna y volver hacia la Tierra." },
      { title: "El trabajo en equipo gana", text: "Los ingenieros en la Tierra resolvieron un problema tras otro, incluso cómo encajar un filtro de aire cuadrado en un soporte redondo. Después de casi seis días, los tres astronautas cayeron al mar sanos y salvos." }
    ],
    dialogue: {
      npc: { name: "Marge", role: "una ingeniera del Control de Misión, 1970" },
      intro: "¡Hola! Soy Marge, ingeniera del Control de Misión. Tenemos un rompecabezas que resolver, y tres astronautas cuentan con nosotros. ¡Toma un lápiz y vamos a pensarlo juntos!",
      topics: [
        { ask: "¿Qué salió mal?", answer: "Se rompió un tanque de oxígeno, y la nave principal empezó a quedarse sin energía y sin oxígeno. Así que la tripulación se pasó al módulo lunar, el Aquarius, que tenía sus propias reservas." },
        { ask: "¿Qué era el rompecabezas del filtro de aire?", answer: "Los limpiadores de aire del módulo lunar no daban abasto para tres personas. Los filtros de repuesto de la nave principal eran cuadrados, ¡pero el soporte era redondo! Pensamos cómo unirlos usando solo cosas que había a bordo: bolsas de plástico, cartón y cinta adhesiva." },
        { ask: "¿Cómo volvieron a casa?", answer: "Dieron una vuelta alrededor de la Luna y dejaron que su gravedad los lanzara de vuelta hacia la Tierra. Nosotros calculamos exactamente cuándo encender el motor para que no se desviaran." },
        { ask: "¿Estaba la gente preocupada?", answer: "Sí, pero nadie se rindió. Todo el mundo mantuvo la calma, compartió ideas y revisó el trabajo de los demás. Así se resuelven los grandes problemas." },
        { ask: "¿Cómo terminó?", answer: "El 17 de abril de 1970, la cápsula cayó en el océano Pacífico, y los tres astronautas volvieron a casa sanos y salvos. ¡Todo el mundo lo celebró!" }
      ],
      challenge: {
        q: "¿Cómo consiguió el equipo encajar un filtro de aire cuadrado en un soporte redondo?",
        choices: ["Volaron a casa a buscar uno redondo", "No necesitaban aire limpio", "Construyeron una pieza de unión con bolsas, cartón y cinta adhesiva"],
        explain: "Los ingenieros en la Tierra pensaron cómo unirlos con bolsas de plástico, cartón y cinta adhesiva, y la tripulación lo construyó a bordo."
      },
      farewell: "Recuerda: cuando algo sale mal, mantén la calma, trabaja en equipo y resuelve los problemas de uno en uno."
    },
    timeline: {
      title: "Las misiones Apolo",
      events: [
        { label: "El Apolo 8 es la primera tripulación que da vueltas alrededor de la Luna", when: "1968" },
        { label: "El Apolo 11 aterriza en la Luna", when: "1969" },
        { label: "La tripulación del Apolo 13 rodea la Luna y vuelve a casa sana y salva", when: "1970" },
        { label: "Los astronautas del Apolo 15 conducen el primer coche en la Luna, el Róver Lunar", when: "1971" },
        { label: "El Apolo 17, la última misión Apolo, visita la Luna", when: "1972" }
      ]
    },
    artifact: {
      name: "El arreglo del filtro de aire cuadrado",
      text: "Esta es una maqueta del famoso arreglo al que la tripulación llamó «el buzón»: un filtro de aire cuadrado unido a un tubo redondo con bolsas de plástico, cartón y cinta adhesiva. Los astronautas lo construyeron siguiendo las instrucciones del Control de Misión, y mantuvo limpio su aire."
    },
    quiz: [
      { q: "¿Qué se rompió en el Apolo 13 de camino a la Luna?", choices: ["Un tanque de oxígeno", "La radio", "Una ventana"], hint: "Algo que guardaba oxígeno.", explain: "Se rompió un tanque de oxígeno, así que la tripulación ya no podía aterrizar en la Luna." },
      { q: "¿Qué usó la tripulación como «bote salvavidas»?", choices: ["Un paracaídas", "Su módulo lunar, el Aquarius", "Una estación espacial"], hint: "Estaba hecho para aterrizar en la Luna.", explain: "La tripulación se pasó a su módulo lunar, el Aquarius, y lo usó como un bote salvavidas." },
      { q: "¿Cómo dio la vuelta el Apolo 13 para volver a casa?", choices: ["Fue marcha atrás como un coche", "Se paró y esperó", "Rodeó la Luna, usando la gravedad de la Luna"], hint: "Piensa en dar una vuelta alrededor de la Luna.", explain: "La nave rodeó la Luna, y la gravedad de la Luna ayudó a lanzarla de vuelta hacia la Tierra." },
      { q: "¿Cómo terminó la misión del Apolo 13?", choices: ["Los tres astronautas volvieron a casa sanos y salvos", "Se quedaron en la Luna", "Aterrizaron en Marte"], hint: "¡Todo el mundo lo celebró!", explain: "Los tres astronautas cayeron sanos y salvos en el océano Pacífico el 17 de abril de 1970." },
      { q: "¿Cuál es la gran lección del Apolo 13?", choices: ["Rendirse cuando algo sale mal", "Mantener la calma, trabajar en equipo y resolver los problemas de uno en uno", "No ir nunca al espacio"], hint: "Piensa en el Control de Misión.", explain: "Manteniendo la calma y trabajando en equipo, resolvieron todos los problemas y trajeron a todos a casa." }
    ]
  },
  'h7-moon-new-explorers': {
    title: "Los nuevos exploradores de la Luna",
    topicName: "Las misiones lunares de hoy",
    blurb: "Danuri, Chandrayaan-3, SLIM y Artemis: conoce las nuevas misiones que vuelven a la Luna.",
    reading: [
      { title: "Danuri, de Corea", text: "En 2022, Corea envió su primera nave espacial a la Luna, Danuri, cuyo nombre quiere decir «disfrutar de la Luna». Da vueltas alrededor de la Luna, haciendo fotos y estudiando su superficie." },
      { title: "Chandrayaan-3, de la India", text: "En agosto de 2023, la Chandrayaan-3 de la India aterrizó en la zona cercana al polo sur de la Luna: fue la primera nave que aterrizó tan al sur. Su pequeño róver, Pragyan, salió rodando a explorar." },
      { title: "SLIM, de Japón", text: "En enero de 2024, la SLIM de Japón, apodada el «Francotirador Lunar», aterrizó muy cerca del punto exacto al que apuntaba. Acabó volcada sobre el morro, ¡pero aun así funcionó y envió imágenes!" },
      { title: "Artemis", text: "Las misiones Artemis de la NASA están llevando de nuevo a personas hacia la Luna. La Artemis I dio la vuelta a la Luna sin tripulación en 2022, con un maniquí astronauta a bordo para probar los asientos y los trajes." }
    ],
    dialogue: {
      npc: { name: "Seo-yeon", role: "una joven científica de un equipo de misión lunar" },
      intro: "¡Annyeong! (Así se dice «hola» en coreano). Soy Seo-yeon. Estudio la Luna con imágenes de la nave espacial Danuri. ¡Son tiempos emocionantes: muchos países están visitando la Luna! ¿Quieres verlo?",
      topics: [
        { ask: "¿Qué hace Danuri?", answer: "Danuri da vueltas alrededor de la Luna y hace fotos con sus cámaras. Una de ellas, fabricada por la NASA, es tan sensible que puede ver dentro de cráteres profundos que siempre están en sombra." },
        { ask: "¿Por qué todo el mundo quiere ir al polo sur?", answer: "Algunos cráteres cerca del polo sur nunca reciben luz del sol, así que son superfríos. Los científicos creen que allí se esconde hielo de agua. ¡El hielo podría dar a los futuros exploradores agua para beber y oxígeno para respirar!" },
        { ask: "¿Qué encontró la Chandrayaan-3?", answer: "Su róver, Pragyan, analizó el suelo y encontró azufre y otros elementos cerca del polo sur. Funcionó durante unas dos semanas: un día lunar entero." },
        { ask: "¿Por qué a la SLIM la llaman el Francotirador Lunar?", answer: "¡Porque aterrizó muy cerca de su objetivo, mucho más cerca que los módulos anteriores! Aterrizar justo donde quieres es importante para las futuras misiones." },
        { ask: "¿Podría ir yo a la Luna algún día?", answer: "¡Quizá! Hay astronautas preparándose para volver, y después podrían venir las bases lunares. Estudia ciencias, matemáticas y a trabajar en equipo, ¡y quién sabe dónde aterrizarás!" }
      ],
      challenge: {
        q: "¿Qué esperan encontrar los científicos en los cráteres fríos y oscuros cerca del polo sur de la Luna?",
        choices: ["Conejos lunares", "Hielo de agua", "Monedas de oro"],
        explain: "Los científicos creen que en esos cráteres se esconde hielo de agua. Podría dar a los exploradores agua y oxígeno."
      },
      farewell: "Sigue atento a las noticias del próximo aterrizaje en la Luna. ¡Quizá algún día lea noticias sobre ti!"
    },
    timeline: {
      title: "De vuelta a la Luna",
      events: [
        { label: "El Apolo 11 aterriza en la Luna", when: "1969" },
        { label: "Los científicos encuentran señales de agua en la Luna gracias a la Chandrayaan-1 de la India", when: "2009" },
        { label: "Danuri, de Corea, sale rumbo a la Luna", when: "2022" },
        { label: "La Chandrayaan-3 de la India aterriza cerca del polo sur de la Luna", when: "2023" },
        { label: "La SLIM de Japón aterriza muy cerca de su objetivo", when: "2024" }
      ]
    },
    artifact: {
      name: "Una maqueta del orbitador Danuri",
      text: "Danuri es una nave espacial con forma de caja, más o menos tan alta como una persona adulta, con paneles solares para producir electricidad y con cámaras e instrumentos que miran hacia la Luna."
    },
    quiz: [
      { q: "¿Cómo se llama la primera nave espacial de Corea que fue a la Luna?", choices: ["Danuri", "Sputnik", "Hubble"], hint: "Su nombre quiere decir «disfrutar de la Luna».", explain: "Danuri es la primera nave espacial lunar de Corea, lanzada en 2022." },
      { q: "¿Dónde aterrizó la Chandrayaan-3 de la India en 2023?", choices: ["En la cara oculta", "En la zona cercana al polo sur de la Luna", "En Marte"], hint: "Donde están los cráteres fríos y oscuros.", explain: "La Chandrayaan-3 aterrizó cerca del polo sur de la Luna, más al sur que ningún módulo antes." },
      { q: "¿Por qué a la SLIM de Japón la llaman el «Francotirador Lunar»?", choices: ["Es muy rápida", "Hace mucho ruido", "Aterrizó muy cerca de su objetivo exacto"], hint: "Un francotirador da justo en el blanco.", explain: "La SLIM aterrizó muy cerca del punto exacto al que apuntaba." },
      { q: "¿Para qué podría servir el hielo de agua de la Luna?", choices: ["Para patinar sobre hielo", "Podría dar a los exploradores agua y oxígeno", "Para mantener frías las rocas lunares"], hint: "¿Qué necesitan las personas para vivir?", explain: "El hielo se podría derretir para tener agua, y el agua se puede separar para obtener oxígeno para respirar." },
      { q: "¿Qué llevó la Artemis I alrededor de la Luna en 2022?", choices: ["Un maniquí astronauta", "Cuatro astronautas", "Un conejo lunar"], hint: "Voló sin tripulación.", explain: "La Artemis I voló sin tripulación, pero llevaba un maniquí astronauta para probar los asientos y los trajes." }
    ]
  },

  // ───────── Observatorio Estelar (física) ─────────
  // ── Base lunar 1: Cráter del Aterrizaje ──
  'p1-moon-phases': {
    title: "La Luna cambia de forma",
    topicName: "Las fases de la Luna",
    blurb: "¿Por qué la Luna cambia de forma? Juega con la luz y las sombras para descubrirlo.",
    reading: [
      { title: "La luz de la Luna es luz del sol", text: "La Luna no tiene luz propia. El Sol la ilumina, y la Luna nos devuelve parte de esa luz." },
      { title: "Siempre hay una mitad iluminada", text: "El Sol siempre ilumina la mitad de la Luna que está de cara a él. Mientras la Luna da vueltas alrededor de la Tierra, vemos trozos distintos de esa mitad brillante." },
      { title: "De luna nueva a luna llena", text: "Cuando no vemos nada de la mitad iluminada, es luna nueva. Noche tras noche crece hasta ser una luna creciente, una media luna y luego una luna llena. Después vuelve a menguar." },
      { title: "Luz y sombra", text: "La luz viaja en línea recta. El lado de la Luna que no mira al Sol está en su propia sombra, por eso se ve oscuro." }
    ],
    sim: {
      predict: {
        q: "La linterna es como el Sol. La acercas al juguete. ¿Qué le pasa a la sombra del juguete?",
        choices: ["Se hace más grande", "Se hace más pequeña", "Desaparece"],
        explain: "Cerca de la linterna, el juguete tapa más luz, así que su sombra se hace grande. Todo lo que tapa la luz hace sombra, ¡incluso la Luna!"
      }
    },
    quiz: [
      { q: "¿Tiene la Luna luz propia?", choices: ["Sí, brilla como una lámpara", "No, refleja la luz del Sol"], hint: "Piensa de dónde viene la luz de la Luna.", explain: "La Luna no tiene luz propia. Nos devuelve la luz del sol." },
      { q: "¿Cómo se llama cuando vemos entera la cara iluminada de la Luna?", choices: ["Luna nueva", "Luna llena", "Media luna"], hint: "La Luna parece un círculo redondo y entero.", explain: "Cuando vemos entera la cara iluminada, es luna llena." },
      { q: "¿Qué parte de la Luna ilumina el Sol?", choices: ["Ninguna", "Solo el centro", "La mitad, siempre"], hint: "La cara que mira al Sol.", explain: "El Sol siempre ilumina la mitad de la Luna que está de cara a él." },
      { q: "¿Cuánto tiempo pasa, más o menos, de una luna llena a la siguiente?", choices: ["Unos 29 días y medio", "Un año", "Una semana"], hint: "Más o menos un mes.", explain: "De una luna llena a la siguiente pasan unos 29 días y medio." },
      { q: "¿Cómo se llama la Luna cuando tiene forma fina y curvada?", choices: ["Cráter", "Luna creciente", "Cometa"], hint: "Parece una sonrisa o un plátano.", explain: "Cuando la Luna tiene forma fina y curvada, se llama luna creciente." }
    ]
  },
  'p1-moon-footprints': {
    title: "Botas lunares y huellas",
    topicName: "El rozamiento",
    blurb: "¿Por qué los astronautas no resbalan y por qué sus huellas no se borran? Haz rodar un cochecito para descubrirlo.",
    reading: [
      { title: "Huellas que se quedan", text: "¡Las huellas que dejaron los astronautas siguen en la Luna! Allí no hay viento ni lluvia que las borren." },
      { title: "Botas que agarran", text: "Las botas lunares tienen suelas con relieves y surcos. Los surcos se agarran al suelo polvoriento, y así los astronautas no resbalan." },
      { title: "El rozamiento", text: "El rozamiento es una fuerza que frena las cosas cuando dos superficies se rozan. Las superficies ásperas tienen mucho rozamiento. Las lisas y resbaladizas tienen muy poco." },
      { title: "Polvo lunar pegajoso", text: "El polvo lunar es muy fino y afilado, un poco como cristal molido. Se pega a todo, ¡así que los astronautas tenían que cepillarse los trajes!" }
    ],
    sim: {
      predict: {
        q: "El cochecito baja por la rampa y rueda sobre arena, alfombra y hielo. ¿Sobre cuál llegará más lejos?",
        choices: ["Arena", "Alfombra", "Hielo"],
        explain: "El hielo es liso y resbaladizo, con muy poco rozamiento, así que el coche llega más lejos. Las superficies con bultos que agarran lo frenan enseguida, igual que las botas lunares impiden que los astronautas resbalen."
      }
    },
    quiz: [
      { q: "¿Por qué las huellas de los astronautas siguen en la Luna?", choices: ["Alguien las vigila", "No hay viento ni lluvia que las borren", "Están pintadas"], hint: "¿Qué borra las huellas en la Tierra?", explain: "En la Luna no hay viento ni lluvia, así que las huellas se quedan durante muchísimo tiempo." },
      { q: "¿Qué es el rozamiento?", choices: ["Una fuerza que frena las cosas cuando las superficies se rozan", "Un tipo de roca lunar", "Una luz en el cielo"], hint: "Frótate las manos.", explain: "El rozamiento es una fuerza que frena las cosas cuando dos superficies se rozan." },
      { q: "¿Qué superficie tiene menos rozamiento?", choices: ["Arena", "Alfombra", "Hielo"], hint: "¿Cuál es resbaladiza?", explain: "El hielo es liso y resbaladizo, así que tiene el menor rozamiento." },
      { q: "¿Por qué las botas lunares tienen la suela con relieves?", choices: ["Para que sean bonitas", "Para que pesen menos", "Para agarrarse al suelo y que los astronautas no resbalen"], hint: "Piensa en los surcos de la suela de tus zapatos deportivos.", explain: "Los relieves se agarran al suelo polvoriento, así que los astronautas no resbalan." },
      { q: "¿Cómo es el polvo lunar?", choices: ["Blando y mojado como el barro", "Muy fino y afilado, y se pega a todo", "Esponjoso como la nieve"], hint: "Como cristal molido.", explain: "El polvo lunar es muy fino y afilado, y se pega a todo." }
    ]
  },

  // ── Base lunar 2: Loma del Cohete ──
  'p2-moon-silent-space': {
    title: "¡Chist! En el espacio no hay sonido",
    topicName: "El sonido",
    blurb: "Haz vibrar una regla para hacer sonidos y descubre por qué el espacio es silencioso.",
    reading: [
      { title: "El sonido es una vibración", text: "El sonido se produce cuando algo vibra, es decir, se mueve adelante y atrás muy deprisa. Las vibraciones empujan el aire, y el aire las lleva hasta tus oídos." },
      { title: "Sin aire no hay sonido", text: "En la Luna no hay aire que lleve las vibraciones. ¡Si una roca cayera justo a tu lado, no la oirías a través del espacio vacío!" },
      { title: "Radios para hablar", text: "Los astronautas hablan entre ellos con radios que llevan en el casco. Las ondas de radio pueden viajar por el espacio vacío, pero el sonido no." },
      { title: "Cascos que se tocan", text: "Si dos astronautas juntan sus cascos, ¡pueden oírse un poco, porque el sonido viaja a través de los cascos sólidos!" }
    ],
    sim: {
      predict: {
        q: "Haces más corta la parte de la regla que sobresale y luego la haces vibrar. ¿Cómo sonará la nota?",
        choices: ["Más grave", "Más aguda", "Igual"],
        explain: "Una regla más corta vibra más deprisa, así que la nota es más aguda. En el laboratorio hay aire que lleva el sonido hasta tus oídos. ¡En la Luna no oirías nada!"
      }
    },
    quiz: [
      { q: "En la Tierra, ¿qué lleva el sonido hasta tus oídos?", choices: ["La luz", "El aire", "Los imanes"], hint: "Está a tu alrededor y lo respiras.", explain: "El sonido viaja por el aire hasta tus oídos." },
      { q: "¿Por qué el sonido no puede viajar por el espacio?", choices: ["No hay aire que lo lleve", "El espacio es demasiado frío", "El espacio es demasiado oscuro"], hint: "¿Qué necesita el sonido para viajar?", explain: "El sonido necesita algo como el aire para viajar, y el espacio está vacío." },
      { q: "¿Cómo hablan entre ellos los astronautas en la Luna?", choices: ["Gritando muy fuerte", "Moviendo banderas", "Con radios en el casco"], hint: "Las ondas de radio pueden cruzar el espacio vacío.", explain: "Los astronautas usan radios, porque las ondas de radio pueden viajar por el espacio vacío." },
      { q: "¿Qué produce un sonido?", choices: ["Algo que vibra", "Algo que brilla", "Algo que está frío"], hint: "Tócate la garganta mientras tarareas.", explain: "Los sonidos se producen cuando algo vibra, es decir, se mueve adelante y atrás." },
      { q: "Dos astronautas juntan sus cascos. ¿Pueden oírse un poco?", choices: ["No, nunca", "Sí, el sonido viaja a través de los cascos sólidos"], hint: "El sonido también puede viajar a través de las cosas sólidas.", explain: "El sonido puede viajar a través de las cosas sólidas, así que, si juntan los cascos, pueden oírse un poco." }
    ]
  },
  'p2-moon-hammer-feather': {
    title: "El martillo y la pluma",
    topicName: "La gravedad y la caída",
    blurb: "Deja caer un martillo y una pluma en la Luna, igual que hizo un astronauta en 1971.",
    reading: [
      { title: "La gravedad atrae", text: "La gravedad es la fuerza que hace que las cosas caigan. La Tierra atrae las cosas hacia abajo, y la Luna también, pero con más suavidad." },
      { title: "El aire se pone en medio", text: "En la Tierra, una pluma cae despacito porque el aire la empuja hacia arriba. Un martillo atraviesa el aire con facilidad y cae deprisa." },
      { title: "Una prueba famosa", text: "En 1971, el astronauta David Scott dejó caer a la vez un martillo y una pluma en la Luna, donde no hay aire." },
      { title: "¿Qué pasó?", text: "¡Llegaron al suelo exactamente a la vez! Sin aire que se ponga en medio, todo cae a la misma velocidad, sea pesado o ligero." }
    ],
    sim: {
      predict: {
        q: "En la Luna, sin aire, dejas caer a la vez un martillo y una pluma. ¿Qué pasa?",
        choices: ["El martillo llega primero", "Llegan a la vez", "La pluma sale flotando"],
        explain: "Sin aire que frene la pluma, la gravedad atrae a los dos hacia abajo a la misma velocidad, así que llegan juntos, igual que en la Luna en 1971."
      }
    },
    quiz: [
      { q: "¿Qué es la gravedad?", choices: ["Un tipo de viento", "La fuerza que hace que las cosas caigan", "La luz del Sol"], hint: "Es lo que te mantiene pegado al suelo.", explain: "La gravedad es la fuerza que hace que las cosas caigan." },
      { q: "¿Por qué una pluma cae despacio en la Tierra?", choices: ["El aire la empuja hacia arriba", "Es demasiado pesada", "La gravedad no atrae a las plumas"], hint: "Algo que tiene que atravesar.", explain: "El aire empuja la pluma y la frena." },
      { q: "¿Quién dejó caer un martillo y una pluma en la Luna?", choices: ["Galileo", "Un conejo lunar", "El astronauta David Scott"], hint: "Un astronauta del Apolo, en 1971.", explain: "El astronauta David Scott hizo la prueba en la Luna en 1971." },
      { q: "En la Luna, ¿qué llega primero: el martillo o la pluma?", choices: ["El martillo", "La pluma", "Llegan juntos"], hint: "En la Luna no hay aire.", explain: "Sin aire, caen a la misma velocidad y llegan juntos." },
      { q: "¿La gravedad de la Luna es más fuerte o más débil que la de la Tierra?", choices: ["Más débil", "Más fuerte", "Igual"], hint: "Allí los astronautas podían dar saltos muy altos.", explain: "La gravedad de la Luna es más débil, más o menos una sexta parte de la de la Tierra." }
    ]
  },

  // ── Base lunar 3: Huellas del Róver ──
  'p3-moon-craters': {
    title: "Cómo se forman los cráteres",
    topicName: "Cráteres e impactos",
    blurb: "Las rocas espaciales chocan y se forman cráteres. Deja caer dos pelotas y descubre cómo caen las cosas.",
    reading: [
      { title: "Rocas espaciales", text: "El espacio está lleno de rocas, desde granitos diminutos hasta rocas enormes. Cuando una choca contra la Luna, abre un agujero redondo llamado cráter." },
      { title: "Rápido quiere decir grande", text: "Las rocas espaciales chocan muy deprisa. Cuanto más rápida y más grande es la roca, más grande es el cráter que hace." },
      { title: "Sin aire que la proteja", text: "En la Tierra, el aire quema la mayoría de las rocas espaciales pequeñas antes de que lleguen al suelo. ¡Las vemos como estrellas fugaces! La Luna no tiene aire, así que hasta las pequeñas llegan al suelo." },
      { title: "Cráteres que duran", text: "En la Tierra, el viento, la lluvia y las plantas van borrando los cráteres poco a poco. La Luna no tiene tiempo atmosférico (ni lluvia ni viento), así que sus cráteres pueden durar miles de millones de años." }
    ],
    sim: {
      predict: {
        q: "Dejas caer a la vez una pelota pequeña y una pesada bola de bolos. ¿Cuál llega primero?",
        choices: ["La bola de bolos, con mucha ventaja", "La pelota pequeña", "Llegan casi a la vez"],
        explain: "El aire casi no frena a ninguna de las dos, así que caen casi a la misma velocidad y llegan juntas. La gravedad acelera igual las cosas pesadas y las ligeras. ¡La bola pesada solo hace una abolladura más grande!"
      }
    },
    quiz: [
      { q: "¿Qué es un cráter?", choices: ["Una montaña de la Luna", "Un agujero redondo que se forma cuando choca una roca espacial", "Un tipo de cohete"], hint: "¡Pum!", explain: "Un cráter es un agujero redondo que se abre cuando una roca espacial choca contra el suelo." },
      { q: "¿Por qué los cráteres de la Luna duran tanto?", choices: ["No hay viento ni lluvia que los borren", "Están hechos de metal", "Los astronautas los arreglan"], hint: "Piensa en el tiempo atmosférico.", explain: "En la Luna no hay viento ni lluvia, así que nada borra sus cráteres." },
      { q: "¿Qué les pasa a la mayoría de las rocas espaciales pequeñas que caen hacia la Tierra?", choices: ["Rebotan", "Se convierten en lluvia", "Se queman en el aire y las vemos como estrellas fugaces"], hint: "A lo mejor ves una cruzar el cielo de noche.", explain: "La mayoría de las rocas espaciales pequeñas se queman en el aire, y las vemos como estrellas fugaces." },
      { q: "¿Qué hace un cráter más grande?", choices: ["Una roca lenta y pequeña", "Una roca rápida y grande", "Siempre hacen el mismo cráter"], hint: "Más velocidad y más tamaño.", explain: "Una roca más rápida y más grande choca más fuerte y hace un cráter más grande." },
      { q: "Si el aire no se pone en medio, ¿las cosas pesadas caen más deprisa que las ligeras?", choices: ["Sí, mucho más deprisa", "No, caen a la misma velocidad"], hint: "Acuérdate del martillo y la pluma.", explain: "Sin aire de por medio, las cosas pesadas y las ligeras caen a la misma velocidad." }
    ]
  },
  'p3-moon-ice': {
    title: "Hielo en los cráteres oscuros de la Luna",
    topicName: "Flotar y hundirse",
    blurb: "Los científicos han encontrado señales de hielo en la Luna. ¡Descubre por qué el hielo flota!",
    reading: [
      { title: "Cráteres en sombra", text: "Cerca de los polos de la Luna, algunos cráteres profundos no reciben nunca nada de luz del sol. Son de los lugares más fríos que conocemos." },
      { title: "Hielo escondido", text: "Los científicos han encontrado señales de hielo de agua congelado en esos cráteres oscuros. ¡Algún día, los astronautas podrían derretirlo para beber!" },
      { title: "El hielo flota", text: "Cuando el agua se congela, se expande y ocupa más espacio. Por eso el hielo es más ligero que la misma cantidad de agua, y flota." },
      { title: "¿Flota o se hunde?", text: "Las cosas que pesan menos que la misma cantidad de agua flotan. Las que pesan más se hunden. Por eso una piedra se hunde y un corcho flota." }
    ],
    sim: {
      predict: {
        q: "Echas un cubito de hielo al tanque de agua. ¿Flotará o se hundirá?",
        choices: ["Se hunde hasta el fondo", "Flota"],
        explain: "¡El hielo flota! Cuando el agua se congela se expande, así que el hielo es más ligero que la misma cantidad de agua."
      }
    },
    quiz: [
      { q: "¿En qué parte de la Luna han encontrado los científicos señales de hielo?", choices: ["En cráteres oscuros cerca de los polos", "En la cima de la montaña más alta", "En el centro de la luna llena"], hint: "Lugares que nunca reciben luz del sol.", explain: "Se han encontrado señales de hielo en cráteres oscuros y helados cerca de los polos de la Luna." },
      { q: "¿El hielo flota o se hunde en el agua?", choices: ["Se hunde", "Flota"], hint: "Piensa en los cubitos de hielo de una bebida.", explain: "El hielo flota, porque es más ligero que la misma cantidad de agua." },
      { q: "¿Qué le pasa al agua cuando se congela?", choices: ["Encoge mucho", "Se expande y ocupa más espacio", "Desaparece"], hint: "Una botella de agua congelada se puede abombar.", explain: "El agua se expande cuando se congela, así que el hielo ocupa más espacio." },
      { q: "¿Cuál de estas cosas se hunde en el agua?", choices: ["Un corcho", "Una manzana", "Una piedra"], hint: "Pesa mucho para su tamaño.", explain: "Una piedra pesa más que la misma cantidad de agua, así que se hunde." },
      { q: "¿Para qué les serviría a los astronautas el hielo de la Luna?", choices: ["Podrían derretirlo para tener agua", "Para hacer muñecos de nieve", "Para enfriar sus cohetes"], hint: "¿Qué necesitan las personas todos los días?", explain: "Los astronautas podrían derretir el hielo para tener agua para beber." }
    ]
  },

  // ── Base lunar 4: Valle de la Antena ──
  'p4-moon-earthshine': {
    title: "La luz cenicienta: luz que vuelve a casa",
    topicName: "La reflexión de la luz",
    blurb: "Haz rebotar la luz en un espejo y descubre por qué la parte oscura de la Luna puede brillar.",
    reading: [
      { title: "La luz rebota", text: "Cuando la luz llega a un espejo, rebota. El ángulo con el que llega es igual al ángulo con el que sale." },
      { title: "La luz cenicienta", text: "Mira una luna creciente muy fina. ¡A veces puedes ver que la parte oscura brilla un poquito! Es luz del sol que rebotó en la Tierra, llegó a la Luna y volvió hasta tus ojos. Se llama luz cenicienta." },
      { title: "Leonardo lo descubrió", text: "Hace más de 500 años, el artista e inventor Leonardo da Vinci descubrió que ese brillo suave es luz que viene de la Tierra." },
      { title: "Espejos en la Luna", text: "Los astronautas del Apolo dejaron espejos especiales en la Luna. Los científicos hacen rebotar en ellos luz láser para medir con mucha exactitud la distancia hasta la Luna." }
    ],
    sim: {
      predict: {
        q: "Un rayo de luz llega al espejo a 40° de la normal. ¿A qué ángulo de la normal rebotará?",
        choices: ["40°", "50°", "80°"],
        explain: "El ángulo de entrada es igual al de salida, así que rebota a 40°. La luz del sol que rebota en la Tierra y llega a la Luna sigue la misma regla."
      }
    },
    quiz: [
      { q: "¿Qué es la luz cenicienta?", choices: ["La luz de una lámpara lunar", "Luz del sol que rebota en la Tierra y llega a la Luna", "Fuego en la Luna"], hint: "La luz hace un viaje de ida y vuelta.", explain: "La luz cenicienta es luz del sol que rebota en la Tierra, ilumina la parte oscura de la Luna y vuelve hasta nosotros." },
      { q: "Un rayo llega a un espejo a 25° de la normal. ¿A qué ángulo rebota?", choices: ["25°", "50°", "65°"], hint: "El ángulo de entrada es igual al de salida.", explain: "Rebota a 25°, el mismo ángulo con el que llegó." },
      { q: "¿Quién descubrió qué es la luz cenicienta hace más de 500 años?", choices: ["Neil Armstrong", "Leonardo da Vinci", "Sally Ride"], hint: "Un famoso artista e inventor.", explain: "Leonardo da Vinci descubrió que ese brillo suave es luz que viene de la Tierra." },
      { q: "¿Cuándo es más fácil ver la luz cenicienta?", choices: ["En luna llena", "Con una luna creciente muy fina", "Durante el día"], hint: "Cuando casi toda la cara de la Luna que vemos está oscura.", explain: "Con una luna creciente muy fina, casi toda la cara que vemos está oscura, así que se nota el brillo suave de la luz cenicienta." },
      { q: "¿Por qué los astronautas dejaron espejos en la Luna?", choices: ["Para peinarse", "Para asustar a los conejos lunares", "Para que los científicos hagan rebotar láseres en ellos y midan la distancia"], hint: "Medir con luz.", explain: "Los científicos hacen rebotar luz láser en los espejos para medir con exactitud a qué distancia está la Luna." }
    ]
  },
  'p4-moon-levers': {
    title: "Levantar rocas en la Luna",
    topicName: "Palancas",
    blurb: "Equilibra un balancín y aprende cómo una palanca podría ayudar a los constructores de bases lunares.",
    reading: [
      { title: "Ligera, pero igual de grande", text: "En la Luna, una roca grande parece unas seis veces más ligera que en la Tierra. ¡Pero sigue siendo igual de grande, y cuesta lo mismo ponerla en marcha o pararla!" },
      { title: "Una palanca ayuda", text: "Una palanca es una barra resistente que gira sobre un punto llamado pivote. Empuja hacia abajo el extremo largo, y el extremo corto levanta algo pesado." },
      { title: "Equilibrar", text: "En un balancín, un peso pesado cerca del pivote puede equilibrar un peso ligero lejos del pivote. Peso × distancia tiene que ser igual en los dos lados." },
      { title: "Constructores de bases lunares", text: "En el futuro, los constructores de bases lunares podrían usar palancas, rampas y poleas para mover rocas y levantar muros, y así ahorrar fuerzas dentro de sus pesados trajes espaciales." }
    ],
    sim: {
      predict: {
        q: "Un peso de 2 kg está a 2 pasos del pivote en un lado. ¿Dónde hay que poner un peso de 1 kg en el otro lado para equilibrarlo?",
        choices: ["A 1 paso del pivote", "A 2 pasos del pivote", "A 4 pasos del pivote"],
        explain: "2 kg × 2 pasos = 4 en un lado, así que el peso de 1 kg necesita 1 × 4 = 4: cuatro pasos hacia fuera. Un peso ligero lejos equilibra uno pesado cerca."
      }
    },
    quiz: [
      { q: "¿Cómo se llama el punto sobre el que gira una palanca?", choices: ["El pivote", "El mango", "El cráter"], hint: "Un balancín gira sobre él.", explain: "Una palanca gira sobre un punto llamado pivote." },
      { q: "Un peso de 3 kg está a 1 paso del pivote. ¿Dónde lo equilibra un peso de 1 kg en el otro lado?", choices: ["A 1 paso", "A 3 pasos", "A 4 pasos"], hint: "3 × 1 = 1 × ?", explain: "3 × 1 = 3, y 1 × 3 = 3, así que el peso de 1 kg va a 3 pasos." },
      { q: "Para levantar una roca pesada con una palanca, ¿dónde deberías empujar?", choices: ["Justo al lado del pivote", "Sobre la roca misma", "En el extremo largo, lejos del pivote"], hint: "Cuanto más largo es el brazo con el que empujas, más fácil.", explain: "Empujar lejos del pivote te da la mayor fuerza para hacerla girar." },
      { q: "En la Luna, una roca parece más ligera. ¿Es más pequeña allí?", choices: ["Sí, encoge", "No, es igual de grande, pero la atracción sobre ella es más débil"], hint: "No se cae ningún trozo de la roca.", explain: "La roca es igual de grande. La gravedad más débil de la Luna solo hace que parezca más ligera." },
      { q: "En la Luna, una roca parece unas 6 veces más ligera. Una roca que en la Tierra parece pesar 60 kg, en la Luna parece pesar unos…", choices: ["10 kg", "6 kg", "360 kg"], hint: "Divide entre 6.", explain: "60 ÷ 6 = 10, así que parece pesar unos 10 kg." }
    ]
  },

  // ── Base lunar 5: Cráter del Invernadero ──
  'p5-moon-rockets': {
    title: "Cómo empujan los cohetes",
    topicName: "Los cohetes y el movimiento",
    blurb: "Empujar y que te empujen: cómo vuelan los cohetes y cuánto avanzan las cosas a distintas velocidades.",
    reading: [
      { title: "Empujas y te empujan", text: "Cuando empujas algo, eso te empuja a ti con la misma fuerza. Suelta un globo inflado: el aire sale disparado hacia un lado, ¡y el globo sale zumbando hacia el otro!" },
      { title: "Los cohetes funcionan igual", text: "Un cohete quema combustible y expulsa gas caliente por abajo muy deprisa. El gas empuja el cohete en sentido contrario, hacia el cielo. Funciona incluso en el espacio, donde no hay aire contra el que empujar." },
      { title: "Velocidad, distancia y tiempo", text: "Distancia = velocidad × tiempo. Un róver que avanza 3 metros cada segundo durante 10 segundos recorre 3 × 10 = 30 metros." },
      { title: "Lo bastante rápido para la Luna", text: "Para salir rumbo a la Luna, las naves del Apolo tenían que ir a unos 11 kilómetros por segundo al alejarse de la Tierra." }
    ],
    sim: {
      predict: {
        q: "El carrito A va a 3 m/s y el carrito B va a 6 m/s. Los dos corren durante 4 segundos. ¿Qué distancia recorre el carrito B?",
        choices: ["12 metros", "24 metros", "10 metros"],
        explain: "Distancia = velocidad × tiempo: 6 × 4 = 24 metros. El doble de rápido durante el mismo tiempo quiere decir el doble de lejos."
      }
    },
    quiz: [
      { q: "El aire de un globo sale disparado hacia atrás. ¿Hacia dónde va el globo?", choices: ["Hacia delante, en sentido contrario", "Hacia atrás, con el aire", "No se mueve"], hint: "Empujas y te empujan.", explain: "El aire sale empujado hacia un lado, así que el globo sale empujado hacia el otro." },
      { q: "¿Qué empuja un cohete hacia arriba?", choices: ["El viento", "El gas caliente que sale disparado por abajo", "Un muelle gigante"], hint: "Como el globo.", explain: "El cohete empuja el gas caliente hacia abajo, y el gas empuja el cohete hacia arriba." },
      { q: "¿Puede funcionar el motor de un cohete en el espacio, donde no hay aire?", choices: ["No, necesita aire contra el que empujar", "Sí, empuja su propio gas caliente"], hint: "El cohete no empuja el aire: empuja su gas.", explain: "Un cohete expulsa su propio gas, y el gas lo empuja a él. No hace falta aire." },
      { q: "Un róver va a 5 metros por segundo durante 8 segundos. ¿Qué distancia recorre?", choices: ["13 metros", "40 metros", "3 metros"], hint: "Distancia = velocidad × tiempo.", explain: "5 × 8 = 40 metros." },
      { q: "Un carrito recorre 30 metros en 6 segundos. ¿Cuál es su velocidad?", choices: ["5 metros por segundo", "36 metros por segundo", "180 metros por segundo"], hint: "Velocidad = distancia ÷ tiempo.", explain: "30 ÷ 6 = 5 metros por segundo." }
    ]
  },
  'p5-moon-long-day': {
    title: "Un día larguísimo en la Luna",
    topicName: "Los estados de la materia",
    blurb: "Dos semanas de sol y dos semanas de noche: calienta y enfría agua para ver qué cambia.",
    reading: [
      { title: "Un día muy largo", text: "La Luna gira despacio. De un amanecer al siguiente pasan unos 29 días y medio de la Tierra. ¡Así que la Luna tiene unas dos semanas de sol y luego unas dos semanas de noche!" },
      { title: "Más caliente que el agua hirviendo", text: "Durante el largo día de sol, el suelo cerca del ecuador de la Luna puede llegar a unos 120 °C. ¡Eso está más caliente que el agua hirviendo!" },
      { title: "Más frío que un congelador", text: "Durante la larga noche, el suelo puede bajar a unos −130 °C, mucho más frío que cualquier congelador." },
      { title: "Hielo, agua y vapor", text: "El agua cambia con la temperatura: por debajo de 0 °C se congela y se hace hielo, y a 100 °C hierve y se convierte en vapor. En el suelo abierto de la Luna no hay aire, así que el agua líquida no puede quedarse: se congela o se convierte en gas." }
    ],
    sim: {
      predict: {
        q: "Sigues calentando el agua. ¿A qué temperatura empezará a hervir?",
        choices: ["0 °C", "50 °C", "100 °C"],
        explain: "El agua hierve a 100 °C. ¡Durante el largo día de sol, el suelo de la Luna puede ponerse todavía más caliente!"
      }
    },
    quiz: [
      { q: "¿Cuánto dura, más o menos, el día en un mismo lugar de la Luna?", choices: ["Unas 12 horas", "Unas dos semanas", "Un año"], hint: "La Luna gira muy despacio.", explain: "La Luna gira tan despacio que el día dura unas dos semanas." },
      { q: "¿A qué temperatura se congela el agua?", choices: ["0 °C", "100 °C", "−130 °C"], hint: "Piensa en una mañana de escarcha.", explain: "El agua se congela y se hace hielo a 0 °C." },
      { q: "El suelo soleado cerca del ecuador de la Luna puede llegar a unos 120 °C. ¿Está más caliente que el agua hirviendo?", choices: ["No, está más frío", "Sí, el agua hierve a 100 °C"], hint: "Compara 120 con 100.", explain: "El agua hierve a 100 °C, así que 120 °C está más caliente que el agua hirviendo." },
      { q: "¿Cuáles son los tres estados del agua?", choices: ["Caliente, templada y fría", "Hielo, agua líquida y vapor", "Lluvia, nieve y viento"], hint: "Sólido, líquido y gas.", explain: "El agua puede ser hielo sólido, agua líquida o un gas: el vapor de agua." },
      { q: "¿Por qué no pueden quedarse charcos de agua líquida en el suelo abierto de la Luna?", choices: ["No hay aire, así que el agua se congela o se convierte en gas enseguida", "Se la beben los conejos", "Está demasiado oscuro"], hint: "La Luna no tiene aire.", explain: "Sin aire que la presione, el agua líquida hierve y se escapa enseguida, o se congela." }
    ]
  },

  // ── Base lunar 6: Cuevas de Cristal ──
  'p6-moon-eclipses': {
    title: "En fila: eclipses y mareas",
    topicName: "Eclipses y mareas",
    blurb: "Cuando el Sol, la Tierra y la Luna se ponen en fila, las sombras cruzan el espacio y las mareas crecen.",
    reading: [
      { title: "Una sombra sobre la Tierra", text: "En un eclipse de Sol, la Luna pasa entre el Sol y la Tierra, y su sombra cae sobre la Tierra. ¡No mires nunca directamente al Sol, ni siquiera durante un eclipse!" },
      { title: "Una sombra sobre la Luna", text: "En un eclipse de Luna, la Tierra está entre el Sol y la Luna, y la sombra de la Tierra cae sobre la Luna. ¡La Luna puede volverse de un color rojo cobrizo!" },
      { title: "¿Por qué rojo?", text: "Un poco de luz del sol se desvía al atravesar el aire de la Tierra camino de la Luna. El aire deja pasar mejor la luz roja, igual que en una puesta de sol." },
      { title: "Las mareas", text: "La gravedad de la Luna tira de los océanos de la Tierra, así que el mar sube y baja más o menos dos veces al día. Cuando el Sol, la Tierra y la Luna se ponen en fila, en luna nueva y en luna llena, las mareas son más grandes de lo normal." }
    ],
    sim: {
      predict: {
        q: "Alejas mucho la linterna del juguete. ¿Qué le pasa a la sombra del juguete en la pared?",
        choices: ["Se hace más grande", "Se hace más pequeña", "Se vuelve roja"],
        explain: "Con la linterna lejos, la sombra se encoge. En un eclipse, el tamaño de la sombra decide cuánto se tapa del Sol o de la Luna."
      }
    },
    quiz: [
      { q: "En un eclipse de Sol, ¿qué hay entre el Sol y la Tierra?", choices: ["La Luna", "Marte", "Una nube"], hint: "Su sombra cae sobre la Tierra.", explain: "En un eclipse de Sol, la Luna pasa entre el Sol y la Tierra." },
      { q: "En un eclipse de Luna, ¿de quién es la sombra que cae sobre la Luna?", choices: ["Del Sol", "De la Tierra", "De un cohete"], hint: "La Tierra está en medio.", explain: "En un eclipse de Luna, la sombra de la Tierra cae sobre la Luna." },
      { q: "¿Es seguro mirar directamente al Sol durante un eclipse de Sol?", choices: ["Sí, la Luna hace que sea seguro", "Solo durante un minuto", "No, no mires nunca directamente al Sol"], hint: "Tus ojos son muy valiosos.", explain: "No mires nunca directamente al Sol. Usa gafas especiales para eclipses o un visor de agujerito." },
      { q: "¿Por qué la Luna puede verse roja en un eclipse de Luna?", choices: ["Se calienta muchísimo", "La luz del sol se desvía al atravesar el aire de la Tierra, y la luz roja es la que mejor pasa", "Está cubierta de polvo rojo"], hint: "Piensa en las puestas de sol.", explain: "Un poco de luz del sol se desvía al atravesar el aire de la Tierra, que deja pasar mejor la luz roja, así que la Luna brilla roja." },
      { q: "¿Cuándo son las mareas más grandes de lo normal?", choices: ["Cuando el Sol, la Tierra y la Luna se ponen en fila", "Solo los lunes", "Cuando llueve"], hint: "En luna nueva y en luna llena.", explain: "Cuando el Sol, la Tierra y la Luna se ponen en fila, en luna nueva y en luna llena, sus fuerzas de atracción se suman y las mareas son más grandes de lo normal." }
    ]
  },
  'p6-moon-base-power': {
    title: "Energía para una base lunar",
    topicName: "Circuitos eléctricos",
    blurb: "Paneles solares, baterías y circuitos: descubre qué mantiene encendidas las luces de la base lunar.",
    reading: [
      { title: "Energía del Sol", text: "Los paneles solares convierten la luz del sol en electricidad. Las bases lunares y los róveres los usan, y guardan la electricidad que sobra en baterías para las largas noches oscuras." },
      { title: "Un circuito cerrado", text: "La electricidad solo circula por un camino cerrado, que se llama circuito. Si hay un hueco en cualquier parte, la luz se apaga." },
      { title: "Conductores", text: "Los metales como el cobre y el aluminio dejan pasar la electricidad. Son conductores, por eso los cables se hacen con ellos." },
      { title: "Los aislantes te protegen", text: "La goma y el plástico no dejan pasar la electricidad. Son aislantes, por eso recubren los cables para proteger a los astronautas." }
    ],
    sim: {
      predict: {
        q: "¿Cuál de estas cosas hará que se encienda la bombilla si la usas para cerrar el hueco?",
        choices: ["Una goma elástica", "Una pajita de plástico", "Un clip"],
        explain: "Un clip es de metal, así que la electricidad pasa por él y la bombilla se enciende. La goma y el plástico son aislantes."
      }
    },
    quiz: [
      { q: "¿Qué hacen los paneles solares?", choices: ["Convierten la luz del sol en electricidad", "Protegen de la lluvia", "Hacen brillar la Luna"], hint: "Solar quiere decir «del Sol».", explain: "Los paneles solares convierten la luz del sol en electricidad." },
      { q: "¿Por qué necesita baterías una base lunar?", choices: ["Para pesar más", "Para guardar electricidad para las largas noches oscuras", "Para poner música"], hint: "¿Qué pasa cuando el Sol se pone durante dos semanas?", explain: "Las baterías guardan la electricidad que sobra para las largas noches lunares, cuando a los paneles solares no les llega luz." },
      { q: "¿Cuál de estas cosas es un conductor?", choices: ["Una goma elástica", "Una pajita de plástico", "Un cable de cobre"], hint: "Los cables se hacen con él.", explain: "El cobre es un metal, y los metales conducen la electricidad." },
      { q: "¿Por qué los cables están recubiertos de goma o de plástico?", choices: ["Son aislantes, así que protegen a las personas", "Para que brillen", "Para que la electricidad vaya más deprisa"], hint: "Los aislantes frenan la electricidad.", explain: "La goma y el plástico son aislantes, así que impiden que la electricidad llegue a las personas que tocan los cables." },
      { q: "Hay un hueco en el circuito. ¿Qué le pasa a la bombilla?", choices: ["Brilla más", "Se apaga", "Se vuelve azul"], hint: "La electricidad necesita un camino cerrado.", explain: "La electricidad no puede circular por un camino roto, así que la bombilla se apaga." }
    ]
  },

  // ── Base lunar 7: Estación Luz de Estrellas ──
  'p7-moon-pendulums': {
    title: "Detectives de la gravedad: los péndulos",
    topicName: "Péndulos",
    blurb: "Cronometra un péndulo que se balancea y descubre cómo podría medir la gravedad en la Luna.",
    reading: [
      { title: "Tic, tac", text: "Un péndulo es un peso que cuelga de una cuerda y se balancea de un lado a otro. El tiempo de un balanceo depende de la longitud de la cuerda, no de lo que pesa el peso." },
      { title: "Más largo, más lento", text: "Una cuerda más larga hace un balanceo más lento. Si haces la cuerda cuatro veces más larga, cada balanceo tarda el doble." },
      { title: "Menos gravedad, balanceo más lento", text: "La gravedad tira del péndulo para devolverlo al centro. En la Luna, donde la gravedad es más o menos una sexta parte de fuerte, el mismo péndulo se balancearía unas 2,4 veces más despacio." },
      { title: "Medir la gravedad", text: "Los científicos pueden cronometrar un péndulo para calcular cuánta fuerza tiene la gravedad en un lugar. ¡Un viejo reloj de péndulo que lleváramos a la Luna iría muy atrasado!" }
    ],
    sim: {
      predict: {
        q: "Haces la cuerda del péndulo B cuatro veces más larga que la del péndulo A. ¿Cuánto tarda B en un balanceo, comparado con A?",
        choices: ["Cuatro veces más", "El doble", "Lo mismo"],
        explain: "El tiempo de balanceo crece con la raíz cuadrada de la longitud. Cuatro veces la longitud quiere decir el doble de tiempo, porque √4 = 2."
      }
    },
    quiz: [
      { q: "¿Un peso más pesado hace que un péndulo se balancee más deprisa?", choices: ["Sí, mucho más deprisa", "No, el peso no cambia el tiempo de balanceo"], hint: "¿Qué mostró el experimento?", explain: "El tiempo de balanceo depende de la longitud de la cuerda, no de lo que pesa el peso." },
      { q: "Haces más larga la cuerda de un péndulo. ¿Qué pasa?", choices: ["Se balancea más despacio", "Se balancea más deprisa", "Se para"], hint: "Piensa en un columpio largo del parque.", explain: "Una cuerda más larga hace un balanceo más lento." },
      { q: "Un péndulo tarda 1 segundo en cada balanceo. Haces la cuerda 4 veces más larga. ¿Cuánto tarda ahora un balanceo?", choices: ["4 segundos", "2 segundos", "1 segundo"], hint: "√4 = 2.", explain: "Cuatro veces la longitud duplica el tiempo: 2 segundos." },
      { q: "¿Cómo se balancearía el mismo péndulo en la Luna?", choices: ["Más deprisa, porque la Luna es más pequeña", "Más despacio, porque la gravedad es más débil", "Igual"], hint: "La gravedad tira de él para devolverlo al centro.", explain: "Con una gravedad más débil tirando de él, el péndulo se balancea más despacio en la Luna." },
      { q: "¿En qué punto de su balanceo va más deprisa un péndulo?", choices: ["En el punto más alto", "A media altura de un lado", "Justo abajo del todo"], hint: "¿Dónde se para un momento?", explain: "Va más deprisa justo abajo del todo y se para un momento en cada punto más alto." }
    ]
  },
  'p7-moon-orbits': {
    title: "Cayendo alrededor de la Tierra: las órbitas",
    topicName: "La órbita de la Luna",
    blurb: "Lanza una luna alrededor de un planeta y descubre por qué siempre vemos la misma cara de la Luna.",
    reading: [
      { title: "Caer y no acertar", text: "La Luna siempre está cayendo hacia la Tierra, atraída por la gravedad. ¡Pero también se mueve de lado tan deprisa que nunca llega a acertar! Eso es una órbita." },
      { title: "A la velocidad justa", text: "Si va demasiado despacio, una luna caería. Si va demasiado deprisa, saldría volando al espacio. A la velocidad justa, da vueltas y vueltas." },
      { title: "La misma cara", text: "La Luna gira sobre sí misma una vez en el mismo tiempo que tarda en dar una vuelta a la Tierra: unos 27 días. Por eso siempre nos mira con la misma cara, y nunca vemos la cara oculta desde la Tierra." },
      { title: "Se aleja poco a poco", text: "Las mediciones con láser muestran que la Luna se aleja de la Tierra unos 3,8 centímetros al año, más o menos lo que crecen tus uñas." }
    ],
    sim: {
      predict: {
        q: "Lanzas la luna de lado demasiado deprisa. ¿Qué pasará?",
        choices: ["Cae sobre el planeta", "Gira en un círculo perfecto", "Sale volando al espacio"],
        explain: "Si va demasiado deprisa, la gravedad no consigue curvar lo suficiente su camino, así que se escapa al espacio. Una órbita necesita la velocidad justa."
      }
    },
    quiz: [
      { q: "¿Por qué la Luna no cae sobre la Tierra?", choices: ["Se mueve de lado tan deprisa que nunca llega a acertar", "La gravedad no llega hasta ella", "La sujetan unas cuerdas"], hint: "Caer y no acertar.", explain: "La Luna está cayendo, pero se mueve de lado tan deprisa que nunca acierta a la Tierra." },
      { q: "¿Qué pasa si una luna va demasiado despacio?", choices: ["Sale volando", "Cae", "Gira más deprisa"], hint: "Gana la gravedad.", explain: "Si va demasiado despacio, la gravedad tira de ella y cae." },
      { q: "¿Por qué siempre vemos la misma cara de la Luna?", choices: ["La Luna no gira nada", "La otra cara está siempre a oscuras", "Gira sobre sí misma una vez cada vez que da una vuelta a la Tierra"], hint: "Girar sobre sí misma y dar la vuelta tardan lo mismo.", explain: "La Luna gira sobre sí misma una vez por cada vuelta a la Tierra, así que siempre nos mira con la misma cara." },
      { q: "¿La cara oculta de la Luna está siempre a oscuras?", choices: ["Sí, siempre", "No, también le llega la luz del sol; lo que pasa es que no la vemos desde la Tierra"], hint: "En luna nueva, ¿qué cara está iluminada?", explain: "A la cara oculta le llega tanta luz del sol como a la otra. Simplemente, nunca la vemos desde la Tierra." },
      { q: "¿A qué velocidad, más o menos, se aleja la Luna de la Tierra?", choices: ["Unos 3,8 cm al año", "Más o menos 1 km al día", "No se está alejando"], hint: "Más o menos lo que crecen las uñas.", explain: "Los láseres muestran que la Luna se aleja unos 3,8 centímetros cada año." }
    ]
  }
};
