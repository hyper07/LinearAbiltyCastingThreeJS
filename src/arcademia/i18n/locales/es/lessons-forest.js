/** Español — The Great Tree's lessons (overlay on content/forest.js; text only). */
export default {
  // ───────── Matemáticas del bosque ─────────
  // ── Anillo 1: Hueco de las Raíces ──
  'm1-forest-seed-sorting': {
    title: 'Ordenar semillas', topicName: 'Contar', blurb: 'Ayuda a los ratones del Hueco de las Raíces a contar semillas, de una en una y de cinco en cinco.',
    reading: [
      { title: 'Cuenta cada semilla una vez', text: 'Los ratones del Hueco de las Raíces ordenan las semillas en montones. Toca cada semilla una vez y di un número. El último número que dices es cuántas semillas hay.' },
      { title: 'Montones de cinco', text: 'Los ratones ponen las semillas en montones de 5. Luego cuentan 5, 10, 15, 20. ¡Contar de cinco en cinco es rapidísimo!' },
      { title: 'Ponlas en fila', text: 'Pon las semillas en fila antes de contarlas. Así es fácil ver cuáles ya contaste y cuáles todavía no.' }
    ],
    quiz: [
      { q: 'Un ratón encuentra estas bellotas: 🌰🌰🌰🌰🌰🌰🌰🌰. ¿Cuántas bellotas hay?', choices: ['8', '7', '9'], hint: 'Toca cada bellota una vez mientras cuentas.', explain: '1, 2, 3, 4, 5, 6, 7, 8. Hay 8 bellotas.' },
      { q: 'Los ratones hacen 3 montones de 5 semillas. ¿Cuántas semillas son?', choices: ['8', '15', '10'], hint: 'Cuenta de cinco en cinco, 3 veces.', explain: '5, 10, 15. Tres montones de 5 son 15 semillas.' },
      { q: 'Cuenta los hongos: 🍄🍄🍄🍄🍄🍄🍄🍄🍄🍄🍄. ¿Cuántos hongos hay?', choices: ['10', '12', '11'], hint: 'Cuenta los 10 primeros y luego sigue contando.', explain: '10, y luego 11. Hay 11 hongos.' },
      { q: 'Un ratón cuenta semillas: 17, 18, 19. ¿Qué número va después?', choices: ['20', '21', '10'], hint: '¿Qué número va justo después del 19?', explain: 'Después del 19 va el 20.' },
      { q: 'Pip tiene 2 montones de 5 semillas y 3 semillas más. ¿Cuántas semillas tiene Pip?', choices: ['10', '8', '15', '13'], hint: 'Primero cuenta de cinco en cinco: 5, 10. Luego sigue contando 3 más.', explain: '5, 10, y luego 11, 12, 13. Pip tiene 13 semillas.' }
    ]
  },
  'm1-forest-acorns-taken': {
    title: 'Bellotas que se van', topicName: 'Restas hasta 10', blurb: 'Las ardillas y el viento se llevan cosas. ¿Cuántas quedan?',
    reading: [
      { title: 'Quitar', text: 'Quitar quiere decir que algunas cosas se van. Hay 6 bellotas y una ardilla se lleva 2. Ahora quedan 4 bellotas.' },
      { title: 'Salta hacia atrás', text: 'Empieza en el primer número de la recta numérica. Salta hacia atrás una vez por cada una que se van. Donde caes es cuántas quedan.' },
      { title: 'Comprueba sumando', text: 'Si 7 menos 3 es 4, entonces 4 más 3 debería volver a dar 7. ¡Y así es! Volver a sumar es una buena forma de comprobar.' }
    ],
    quiz: [
      { q: 'Hay 8 bellotas debajo del roble. Una ardilla se lleva 3. ¿Cuántas bellotas quedan?', choices: ['5', '4', '11'], hint: 'Empieza en el 8 y salta 3 hacia atrás.', explain: '8 − 3 = 5. Quedan 5 bellotas.' },
      { q: 'De una ramita cuelgan 7 hojas. El viento se lleva 2. ¿Cuántas hojas quedan?', choices: ['9', '6', '5'], hint: 'Empieza en el 7 y salta 2 hacia atrás.', explain: '7 − 2 = 5. Quedan 5 hojas en la ramita.' },
      { q: 'Una ratoncita tiene 10 semillas. Se come 4. ¿Cuántas semillas tiene ahora?', choices: ['5', '6', '14'], hint: 'Empieza en el 10 y salta 4 hacia atrás.', explain: '10 − 4 = 6. Le quedan 6 semillas.' },
      { q: 'Hay 6 caracoles sobre un tronco. Los 6 se deslizan y se van. ¿Cuántos caracoles quedan en el tronco?', choices: ['0', '6', '12'], hint: 'Si se van todos, ¿qué queda?', explain: '6 − 6 = 0. No queda ningún caracol en el tronco.' },
      { q: 'Hay 9 mariquitas en una hoja. 5 se van volando. ¿Cuántas siguen en la hoja?', choices: ['3', '14', '4', '5'], hint: 'Empieza en el 9 y salta 5 hacia atrás.', explain: '9 − 5 = 4. Todavía hay 4 mariquitas en la hoja.' }
    ]
  },

  // ── Anillo 2: Ramas de Helecho ──
  'm2-forest-hedgehog-columns': {
    title: 'Sumas en columnas con los erizos', topicName: 'Suma en columnas', blurb: 'Suma en columnas los escarabajos y las bayas de los erizos, y llévate la decena.',
    reading: [
      { title: 'Unidades debajo de unidades', text: 'Escribe los números uno debajo del otro. Las unidades van debajo de las unidades y las decenas debajo de las decenas.' },
      { title: 'Empieza por las unidades', text: 'Un erizo encuentra 27 bayas y luego 15 más. Suma primero las unidades: 7 + 5 = 12 unidades.' },
      { title: 'Llévate la decena', text: '12 unidades son 1 decena y 2 unidades. Escribe el 2 y llévate la 1 decena a la columna de las decenas. Luego 2 + 1 + 1 = 4 decenas. Así que 27 + 15 = 42.' }
    ],
    quiz: [
      { q: 'Un erizo se come 38 escarabajos el lunes y 24 el martes. ¿Cuántos escarabajos son?', choices: ['52', '62', '512'], hint: 'Suma primero las unidades: 8 + 4.', explain: '8 + 4 = 12: escribe 2 y llévate 1. Luego 3 + 2 + 1 = 6 decenas. 38 + 24 = 62 escarabajos.' },
      { q: 'Un helecho tiene 46 hojitas. Otro helecho tiene 37. ¿Cuántas hojitas hay en total?', choices: ['83', '73', '713'], hint: '6 + 7 es más que 10, así que te llevarás una.', explain: '6 + 7 = 13: escribe 3 y llévate 1. Luego 4 + 3 + 1 = 8 decenas. 46 + 37 = 83.' },
      { q: 'Un girasol grande puede tener 34 espirales de semillas que giran hacia un lado y 55 que giran hacia el otro. ¿Cuántas espirales hay en total?', choices: ['79', '98', '89'], hint: 'Suma las unidades y luego las decenas. ¿Esta vez te llevas alguna?', explain: '4 + 5 = 9 unidades, así que no te llevas nada. 3 + 5 = 8 decenas. 34 + 55 = 89 espirales.' },
      { q: 'Los erizos juntan 19 caracoles y 19 gusanos. ¿Cuántos son?', choices: ['28', '218', '39', '38'], hint: '9 + 9 = 18. Escribe el 8 y llévate 1.', explain: '9 + 9 = 18: escribe 8 y llévate 1. Luego 1 + 1 + 1 = 3 decenas. 19 + 19 = 38.' },
      { q: 'Resuelves 45 + 28 en columnas. ¿Qué cifra escribes en la columna de las unidades?', choices: ['13', '3', '1'], hint: '5 + 8 = 13. ¿Qué pasa con la decena?', explain: '5 + 8 = 13. Escribe el 3 en la columna de las unidades y llévate 1 decena. El resultado es 73.' }
    ]
  },
  'm2-forest-fern-skip': {
    title: 'Contar a saltos en las Ramas de Helecho', topicName: 'Contar de 2 en 2, de 5 en 5 y de 10 en 10', blurb: 'Cuenta huellas de dos en dos, pétalos de cinco en cinco y hojas de helecho de diez en diez.',
    reading: [
      { title: 'Huellas en parejas', text: 'Las huellas de los erizos van en parejas. Cuéntalas de dos en dos: 2, 4, 6, 8, 10.' },
      { title: 'Cinco pétalos', text: 'Muchas flores, como las rosas silvestres y las flores del manzano, tienen 5 pétalos. Para contar los pétalos de muchas flores, cuenta de cinco en cinco: 5, 10, 15, 20.' },
      { title: 'Manojos de diez', text: 'Los erizos atan las hojas de helecho en manojos de 10. Cuenta los manojos de diez en diez: 10, 20, 30, 40. ¡Todos los números terminan en 0!' }
    ],
    quiz: [
      { q: 'Cada rosa silvestre tiene 5 pétalos. ¿Cuántos pétalos tienen 4 rosas silvestres?', choices: ['9', '20', '25'], hint: 'Cuenta de cinco en cinco, 4 veces.', explain: '5, 10, 15, 20. Cuatro rosas silvestres tienen 20 pétalos.' },
      { q: 'Cuenta las huellas del erizo de dos en dos: 6, 8, 10, 12. ¿Qué número va después?', choices: ['13', '16', '14'], hint: 'Salta 2 más desde el 12.', explain: '12 + 2 = 14. El número siguiente es el 14.' },
      { q: 'Hay 3 manojos de 10 hojas de helecho. ¿Cuántas hojas son?', choices: ['30', '13', '40'], hint: 'Cuenta de diez en diez, 3 veces.', explain: '10, 20, 30. Tres manojos tienen 30 hojas.' },
      { q: 'Hay 5 pájaros en una rama. Cada pájaro tiene 2 alas. ¿Cuántas alas son?', choices: ['7', '12', '8', '10'], hint: 'Cuenta de dos en dos, 5 veces.', explain: '2, 4, 6, 8, 10. Cinco pájaros tienen 10 alas.' },
      { q: 'Cuenta de diez en diez: 40, 50, 60. ¿Qué número va después?', choices: ['61', '70', '80'], hint: 'Salta 10 más desde el 60.', explain: '60 + 10 = 70. El número siguiente es el 70.' }
    ]
  },

  // ── Anillo 3: Ramas de Farolillos ──
  'm3-forest-tree-rings': {
    title: '¿Cuántos años tiene el árbol?', topicName: 'Resta en columnas', blurb: 'Cuenta los anillos de los árboles y resta en columnas para comparar sus edades.',
    reading: [
      { title: 'Un anillo por año', text: 'Cada año, un árbol forma una capa nueva de madera: una parte clara en primavera y otra más oscura en verano. Juntas forman un anillo. Cuenta los anillos de un tocón para saber cuántos años tenía el árbol.' },
      { title: 'Comparar edades', text: 'El tocón de un roble tiene 82 anillos y el de un abedul tiene 47. Para saber cuántos años más tenía el roble, calcula 82 − 47.' },
      { title: 'Pedir prestada una decena', text: 'No puedes quitar 7 de 2, así que pide prestada una decena: 82 se convierte en 7 decenas y 12 unidades. 12 − 7 = 5 y 7 − 4 = 3. El roble tenía 35 años más.' }
    ],
    quiz: [
      { q: 'El tocón de un roble tiene 63 anillos. El de un pino tiene 28. ¿Cuántos anillos más tiene el roble?', choices: ['35', '45', '25'], hint: 'No puedes quitar 8 de 3, así que pide prestada una decena.', explain: 'Pide prestada una decena: 13 − 8 = 5 y 5 − 2 = 3. 63 − 28 = 35 anillos más.' },
      { q: 'Las ardillas cuelgan 52 farolillos. Se apagan 18. ¿Cuántos farolillos siguen encendidos?', choices: ['46', '34', '44'], hint: 'Pide prestada una decena: primero 12 − 8.', explain: '12 − 8 = 4 y 4 − 1 = 3. 52 − 18 = 34 farolillos siguen encendidos.' },
      { q: 'Un árbol tiene 91 años. Otro tiene 45. ¿Cuántos años más tiene el primero?', choices: ['54', '56', '46'], hint: 'No puedes quitar 5 de 1, así que pide prestada una decena.', explain: '11 − 5 = 6 y 8 − 4 = 4. 91 − 45 = 46 años más.' },
      { q: 'Un tocón tiene 80 anillos. Una ardilla ya contó 36. ¿Cuántos anillos le faltan por contar?', choices: ['56', '54', '116', '44'], hint: 'Para 0 − 6 necesitas pedir prestada una decena.', explain: 'Pide prestada una decena: 10 − 6 = 4 y 7 − 3 = 4. 80 − 36 = 44 anillos por contar.' },
      { q: '¿Cuál necesita pedir prestado: 58 − 23 o 61 − 25?', choices: ['58 − 23', '61 − 25'], hint: 'Mira las unidades. ¿La cifra de arriba es más pequeña?', explain: 'En 61 − 25 no puedes quitar 5 unidades de 1 unidad, así que pides prestada una decena. 58 − 23 no lo necesita.' }
    ]
  },
  'm3-forest-lantern-rows': {
    title: 'Farolillos en filas', topicName: 'Tablas de multiplicar', blurb: 'Las ardillas cuelgan farolillos en filas. Multiplica para contarlos.',
    reading: [
      { title: 'Filas de farolillos', text: 'Las ardillas cuelgan farolillos en las ramas: 4 ramas con 3 farolillos en cada una. Eso es 4 × 3 = 12 farolillos.' },
      { title: 'Dale la vuelta', text: '3 ramas con 4 farolillos en cada una también son 12. Así que 4 × 3 = 3 × 4. Si cambias el orden de los números, el resultado es el mismo.' },
      { title: 'Cuenta a saltos', text: 'Para hallar 6 × 5, cuenta de cinco en cinco 6 veces: 5, 10, 15, 20, 25, 30.' }
    ],
    quiz: [
      { q: 'Hay 5 ramas con 6 farolillos cada una. ¿Cuántos farolillos hay?', choices: ['11', '30', '35'], hint: '5 filas de 6 es 5 × 6.', explain: '5 × 6 = 30. Hay 30 farolillos.' },
      { q: 'Una ardilla esconde 4 bellotas en cada uno de 7 agujeros. ¿Cuántas bellotas son?', choices: ['28', '11', '24'], hint: 'Cuenta de cuatro en cuatro 7 veces, o de siete en siete 4 veces.', explain: '7 × 4 = 28. La ardilla esconde 28 bellotas.' },
      { q: 'Un búho ve 3 filas de luciérnagas con 9 en cada fila. ¿Cuántas luciérnagas son?', choices: ['12', '36', '27'], hint: '3 filas de 9 es 3 × 9.', explain: '3 × 9 = 27. Hay 27 luciérnagas.' },
      { q: '¿Qué es lo mismo que 8 × 3?', choices: ['8 + 3', '3 × 8', '8 × 8'], hint: 'Dale la vuelta a las filas.', explain: '8 × 3 = 3 × 8 = 24. Si cambias el orden de los números, el resultado es el mismo.' },
      { q: 'Cada araña tiene 8 patas. ¿Cuántas patas tienen 6 arañas?', choices: ['14', '42', '56', '48'], hint: 'Cuenta de ocho en ocho 6 veces.', explain: '6 × 8 = 48. Seis arañas tienen 48 patas.' }
    ]
  },

  // ── Anillo 4: Copa en Flor ──
  'm4-forest-bee-fractions': {
    title: 'Fracciones en la Copa en Flor', topicName: 'Fracción de una cantidad', blurb: 'Calcula 3/4 de las abejas y 2/5 de las flores.',
    reading: [
      { title: 'Una fracción de un grupo', text: 'Para hallar 1/4 de 20 flores, reparte las 20 flores en 4 grupos iguales. Cada grupo tiene 5, así que 1/4 de 20 es 5.' },
      { title: 'Más de una parte', text: 'Para hallar 3/4 de 20, halla primero 1/4, que es 5. Luego toma 3 de esas partes: 3 × 5 = 15.' },
      { title: 'Divide y luego multiplica', text: 'Divide entre el número de abajo y luego multiplica por el número de arriba. Para 2/5 de 30: 30 ÷ 5 = 6, y 6 × 2 = 12.' }
    ],
    quiz: [
      { q: 'Hay 24 flores en una rama. En 1/2 de ellas hay una abeja. ¿En cuántas flores hay una abeja?', choices: ['12', '48', '22'], hint: '1/2 quiere decir repartir en 2 grupos iguales.', explain: '24 ÷ 2 = 12, así que en 12 flores hay una abeja.' },
      { q: 'Hay 40 abejas en la puerta de la colmena. 3/4 de ellas salen volando a buscar flores. ¿Cuántas abejas salen volando?', choices: ['10', '30', '43'], hint: 'Halla primero 1/4 de 40.', explain: '40 ÷ 4 = 10, y 3 × 10 = 30. Salen volando 30 abejas.' },
      { q: 'Un cerezo tiene 30 flores. 2/5 de ellas están abiertas. ¿Cuántas flores están abiertas?', choices: ['6', '15', '12'], hint: 'Divide entre 5 y luego multiplica por 2.', explain: '30 ÷ 5 = 6, y 6 × 2 = 12. Hay 12 flores abiertas.' },
      { q: 'Una abeja visita 50 flores. 1/10 de ellas son amarillas. ¿Cuántas flores amarillas visita?', choices: ['10', '45', '40', '5'], hint: '1/10 quiere decir repartir en 10 grupos iguales.', explain: '50 ÷ 10 = 5, así que la abeja visita 5 flores amarillas.' },
      { q: '¿Qué es más: 1/3 de 18 pétalos o 1/2 de 10 pétalos?', choices: ['1/2 de 10', '1/3 de 18', 'Son iguales'], hint: 'Calcula cada uno y luego compáralos.', explain: '1/3 de 18 es 18 ÷ 3 = 6. 1/2 de 10 es 5. 6 es más que 5.' }
    ]
  },
  'm4-forest-blossom-multiply': {
    title: 'Abejas y flores', topicName: '2 cifras × 1 cifra', blurb: 'Las abejas visitan muchísimas flores. Multiplica números grandes separándolos en partes.',
    reading: [
      { title: 'Separa el número grande', text: 'Una abeja visita 24 flores en cada viaje. En 3 viajes, eso es 24 × 3. Separa 24 en 20 y 4: 20 × 3 = 60 y 4 × 3 = 12. 60 + 12 = 72 flores.' },
      { title: 'El método de la cuadrícula', text: 'Dibuja una casilla para cada parte del número. Multiplica en cada casilla y luego suma todas las casillas.' },
      { title: 'Primero, estima', text: '37 × 4 debería dar un poco menos que 40 × 4 = 160. Si te sale 1600, algo salió mal. ¡Compruébalo otra vez!' }
    ],
    quiz: [
      { q: 'Cada flor del manzano tiene 5 pétalos. ¿Cuántos pétalos tienen 18 flores?', choices: ['90', '23', '80'], hint: '18 es 10 y 8. Multiplica cada parte por 5.', explain: '10 × 5 = 50 y 8 × 5 = 40. 50 + 40 = 90 pétalos.' },
      { q: 'Una abeja visita 32 flores cada hora. ¿Cuántas flores visita en 4 horas?', choices: ['36', '128', '1208'], hint: '32 es 30 y 2. Multiplica cada parte por 4.', explain: '30 × 4 = 120 y 2 × 4 = 8. 120 + 8 = 128 flores.' },
      { q: 'Un trozo de panal tiene 6 filas con 45 celdas en cada fila. ¿Cuántas celdas son?', choices: ['51', '240', '270'], hint: '45 es 40 y 5. Multiplica cada parte por 6.', explain: '40 × 6 = 240 y 5 × 6 = 30. 240 + 30 = 270 celdas.' },
      { q: 'Hay 7 árboles en el huerto. La rama más baja de cada árbol tiene 26 flores. ¿Cuántas flores son?', choices: ['33', '142', '172', '182'], hint: '26 es 20 y 6. Multiplica cada parte por 7.', explain: '20 × 7 = 140 y 6 × 7 = 42. 140 + 42 = 182 flores.' },
      { q: '¿Cuál es la mejor estimación para 49 × 3?', choices: ['Unos 15', 'Unos 150', 'Unos 1500'], hint: '49 está cerca de 50.', explain: '49 está cerca de 50, y 50 × 3 = 150. El resultado exacto es 147.' }
    ]
  },

  // ── Anillo 5: Altos del Nido ──
  'm5-forest-nest-equations': {
    title: 'Equilibrar ecuaciones en el nido', topicName: 'Ecuaciones', blurb: 'Encuentra el número misterioso de huevos, ramitas y plumas.',
    reading: [
      { title: 'Una balanza equilibrada', text: 'Una ecuación es como una balanza equilibrada: los dos lados pesan lo mismo. x + 4 = 9 quiere decir que un número, más 4, da 9.' },
      { title: 'Quita lo mismo de los dos lados', text: 'Quita 4 de los dos lados y la balanza sigue equilibrada: x = 9 − 4 = 5.' },
      { title: 'Comprueba tu x', text: 'Vuelve a poner tu respuesta: 5 + 4 = 9. Funciona, así que x = 5 es correcto.' }
    ],
    quiz: [
      { q: 'El nido de un petirrojo tiene algunos huevos. El petirrojo pone 2 más y ahora hay 5. Así que x + 2 = 5. ¿Cuánto vale x?', choices: ['7', '3', '2'], hint: 'Quita 2 de los dos lados.', explain: 'x = 5 − 2 = 3. Comprueba: 3 + 2 = 5. Había 3 huevos.' },
      { q: 'Un pájaro tiene x ramitas. Después de encontrar 12 más, tiene 30: x + 12 = 30. ¿Cuánto vale x?', choices: ['18', '42', '12'], hint: 'Quita 12 de los dos lados.', explain: 'x = 30 − 12 = 18. Comprueba: 18 + 12 = 30.' },
      { q: 'Un nido está forrado con x plumas suaves. Con 15 más, hay 40 plumas. ¿Cuánto vale x?', choices: ['55', '35', '25'], hint: 'Escribe x + 15 = 40 y luego quita 15 de los dos lados.', explain: 'x = 40 − 15 = 25. Comprueba: 25 + 15 = 40.' },
      { q: 'Un pájaro carpintero hace x agujeros por la mañana y 9 por la tarde: 21 agujeros en total. ¿Cuánto vale x?', choices: ['30', '11', '13', '12'], hint: 'Escribe x + 9 = 21.', explain: 'x = 21 − 9 = 12. Comprueba: 12 + 9 = 21.' },
      { q: '¿Cuál es el primer paso para resolver x + 7 = 20?', choices: ['Sumar 7 a los dos lados', 'Quitar 7 de los dos lados', 'Quitar 20 de los dos lados'], hint: 'Deshaz el + 7.', explain: 'Quitar 7 de los dos lados mantiene la balanza equilibrada y deja x = 13.' }
    ]
  },
  'm5-forest-meadow-area': {
    title: 'Parcelas del bosque: área y perímetro', topicName: 'Área y perímetro', blurb: 'Pon una cerca alrededor de un prado de nidos y cuenta los cuadrados de un mapa del bosque.',
    reading: [
      { title: 'Perímetro', text: 'El perímetro es la distancia alrededor de toda una figura. Para poner una cerca alrededor de un rectángulo, suma sus cuatro lados.' },
      { title: 'Área', text: 'El área es cuánto espacio plano cubre una figura. Un mapa del bosque puede ser una cuadrícula, y cada cuadrado puede representar 1 metro cuadrado (m²).' },
      { title: 'Un atajo', text: 'En un rectángulo, área = largo × ancho. Un prado de 9 m de largo y 4 m de ancho cubre 36 m². Su perímetro es 9 + 4 + 9 + 4 = 26 m.' }
    ],
    quiz: [
      { q: 'Un rincón de flores silvestres mide 6 m de largo y 5 m de ancho. ¿Cuál es su área?', choices: ['11 m²', '22 m²', '30 m²'], hint: 'Área = largo × ancho.', explain: '6 × 5 = 30, así que el área es 30 m².' },
      { q: 'Una guardabosques pone una cuerda alrededor de una zona de nidos de 10 m de largo y 3 m de ancho. ¿Cuánto mide la cuerda?', choices: ['26 m', '30 m', '13 m'], hint: 'Suma los cuatro lados.', explain: '10 + 3 + 10 + 3 = 26, así que la cuerda mide 26 m.' },
      { q: 'En un mapa del bosque, un grupo de árboles mide 8 cuadrados de ancho y 7 de alto. ¿Cuántos cuadrados cubre?', choices: ['15', '56', '30'], hint: 'Filas × columnas.', explain: '8 × 7 = 56 cuadrados.' },
      { q: 'Un escondite cuadrado para mirar pájaros tiene lados de 3 m. ¿Cuál es el área de su suelo?', choices: ['6 m²', '12 m²', '3 m²', '9 m²'], hint: 'En un cuadrado, el largo y el ancho son iguales.', explain: '3 × 3 = 9, así que el área del suelo es 9 m².' },
      { q: 'Dos prados tienen un área de 12 m². Uno mide 6 m por 2 m y el otro 4 m por 3 m. ¿Cuál tiene el perímetro más largo?', choices: ['El prado de 4 m por 3 m', 'El prado de 6 m por 2 m', 'Son iguales'], hint: 'Suma los cuatro lados de cada uno.', explain: '6 + 2 + 6 + 2 = 16 m, pero 4 + 3 + 4 + 3 = 14 m. ¡La misma área puede tener perímetros diferentes!' }
    ]
  },

  // ── Anillo 6: Anillos de Girasol ──
  'm6-forest-winter-night': {
    title: 'Una noche de invierno en el bosque', topicName: 'Números negativos', blurb: 'En una noche helada en el bosque, la temperatura baja de cero, y el Sol la vuelve a subir.',
    reading: [
      { title: 'Bajo cero', text: 'El agua se congela a 0 °C. En una noche de invierno en el bosque, el termómetro puede bajar hasta −8 °C: ocho grados bajo cero.' },
      { title: 'Un termómetro es una recta numérica', text: 'Pon de pie una recta numérica y tendrás un termómetro. Los números por encima de 0 son más cálidos y los de debajo de 0, más fríos. −10 °C es más frío que −3 °C.' },
      { title: 'El Sol lo calienta todo', text: 'Cuando sale el Sol, hace más calor. Desde −6 °C, si sube 9 grados llegas a 3 °C: cuenta 6 hacia arriba hasta llegar a 0 y luego 3 más.' }
    ],
    quiz: [
      { q: 'A medianoche hace −4 °C en el bosque. Al amanecer ha bajado 3 grados más. ¿Qué temperatura hace al amanecer?', choices: ['−1 °C', '−7 °C', '7 °C'], hint: 'Si enfría, el número se hace más negativo.', explain: '−4 − 3 = −7. Al amanecer hace −7 °C.' },
      { q: 'Al salir el Sol hace −5 °C. Al mediodía, el Sol ha subido la temperatura 11 grados. ¿Qué temperatura hace al mediodía?', choices: ['6 °C', '−16 °C', '16 °C'], hint: 'Cuenta 5 hacia arriba hasta llegar a 0 y luego sigue.', explain: '−5 + 11 = 6. Cuenta 5 hasta llegar a 0 y luego 6 más. Al mediodía hace 6 °C.' },
      { q: '¿Qué es más frío: −12 °C o −9 °C?', choices: ['−9 °C', 'Son iguales', '−12 °C'], hint: 'Cuanto más por debajo de 0, más frío.', explain: '−12 está más por debajo de 0 que −9, así que −12 °C es más frío.' },
      { q: 'Por la tarde hace 4 °C. Por la noche hace −6 °C. ¿Cuántos grados bajó la temperatura?', choices: ['2 grados', '10 grados', '−2 grados'], hint: 'De 4 bajas hasta 0, y de 0 bajas hasta −6.', explain: '4 grados hasta llegar a 0, y luego 6 más hasta −6: 4 + 6 = 10 grados.' },
      { q: 'En un estanque empieza a formarse hielo cuando el agua se enfría por debajo de 0 °C. El agua está a 3 °C y se enfría 5 grados. ¿Hace suficiente frío para que haya hielo?', choices: ['Sí, llega a −2 °C', 'No, llega a 8 °C', 'No, llega a 2 °C'], hint: 'Calcula 3 − 5.', explain: '3 − 5 = −2. El agua llega a −2 °C, que está por debajo de 0 °C, así que se puede formar hielo.' }
    ]
  },
  'm6-forest-sunflower-percent': {
    title: 'Porcentajes de girasol', topicName: 'Porcentajes', blurb: 'Semillas, girasoles y arbolitos: calcula porcentajes en los anillos soleados.',
    reading: [
      { title: 'De cada cien', text: 'Por ciento significa «de cada 100». Si brotan 30 de cada 100 semillas, entonces brotó el 30% de ellas.' },
      { title: 'Los que conviene saber', text: 'El 50% es la mitad, el 25% es un cuarto, el 75% son tres cuartos y el 10% es un décimo.' },
      { title: 'Calcular un porcentaje', text: 'Para hallar el 20% de 80 girasoles: el 10% de 80 es 8, así que el 20% es 2 × 8 = 16 girasoles.' }
    ],
    quiz: [
      { q: 'Una jardinera siembra 60 semillas de girasol. Brota el 50% de ellas. ¿Cuántas semillas brotan?', choices: ['30', '50', '10'], hint: 'El 50% es la mitad.', explain: 'La mitad de 60 es 30, así que brotan 30 semillas.' },
      { q: 'De 100 árboles de un bosque, 45 son robles. ¿Qué porcentaje de los árboles son robles?', choices: ['55%', '45%', '4,5%'], hint: 'Por ciento significa «de cada 100».', explain: '45 de cada 100 es el 45%.' },
      { q: 'La cabeza de un girasol tiene 200 semillas. Un pájaro se come el 25% de ellas. ¿Cuántas semillas se come el pájaro?', choices: ['25', '150', '50'], hint: 'El 25% es un cuarto.', explain: 'Un cuarto de 200 es 50, así que el pájaro se come 50 semillas.' },
      { q: 'Un vivero cultiva 120 arbolitos. Le regala el 10% a una escuela. ¿Cuántos arbolitos recibe la escuela?', choices: ['10', '110', '20', '12'], hint: 'El 10% es un décimo.', explain: 'Un décimo de 120 es 12, así que la escuela recibe 12 arbolitos.' },
      { q: 'Un prado soleado tiene 80 flores silvestres. El 75% de ellas son amarillas. ¿Cuántas flores amarillas hay?', choices: ['75', '20', '60'], hint: 'El 75% son tres cuartos. Halla primero un cuarto.', explain: 'Un cuarto de 80 es 20, así que tres cuartos son 3 × 20 = 60 flores amarillas.' }
    ]
  },

  // ── Anillo 7: Corona Estelar ──
  'm7-forest-treetop-equations': {
    title: 'Ecuaciones en la copa del árbol', topicName: 'Ecuaciones de dos pasos', blurb: 'Resuelve los acertijos de los guardabosques de la copa deshaciendo dos pasos.',
    reading: [
      { title: 'Dos pasos que deshacer', text: 'En 3x + 5 = 26, x se multiplicó por 3 y luego se le sumó 5. Para resolverla, deshaz los pasos en orden inverso: primero quita 5 y luego divide entre 3.' },
      { title: 'Mantén el equilibrio', text: 'Lo que hagas en un lado, hazlo también en el otro. 3x + 5 = 26, así que 3x = 21, así que x = 7. Comprueba: 3 × 7 + 5 = 26.' },
      { title: 'Un arbolito que crece', text: 'Un arbolito mide 15 cm y crece 6 cm cada mes. Después de x meses mide 6x + 15 cm. ¿Cuándo medirá 51 cm? 6x = 51 − 15 = 36, así que x = 6 meses.' }
    ],
    quiz: [
      { q: 'Un guardabosques planta x filas de 8 árboles, más 5 árboles extra: 8x + 5 = 61. ¿Cuánto vale x?', choices: ['7', '8', '6'], hint: 'Quita 5 de los dos lados y luego divide entre 8.', explain: '8x = 61 − 5 = 56, así que x = 56 ÷ 8 = 7. Comprueba: 8 × 7 + 5 = 61.' },
      { q: 'Un girasol mide 20 cm y crece 9 cm cada semana. Después de x semanas mide 92 cm: 9x + 20 = 92. ¿Cuánto vale x?', choices: ['10', '8', '12'], hint: 'Deshaz primero el + 20.', explain: '9x = 92 − 20 = 72, así que x = 72 ÷ 9 = 8 semanas. Comprueba: 9 × 8 + 20 = 92.' },
      { q: 'En el cuaderno de los observadores de estrellas pone 4x − 6 = 30. ¿Cuánto vale x?', choices: ['6', '24', '9'], hint: 'Deshaz el − 6 sumando 6 a los dos lados.', explain: '4x = 30 + 6 = 36, así que x = 36 ÷ 4 = 9. Comprueba: 4 × 9 − 6 = 30.' },
      { q: 'Las entradas para el paseo por la copa cuestan 7 monedas cada una, y un mapa cuesta 4 monedas. Una familia compra x entradas y un mapa por 39 monedas. ¿Cuántas entradas compraron?', choices: ['6', '7', '43', '5'], hint: 'Escribe 7x + 4 = 39 y luego resuélvela.', explain: '7x = 39 − 4 = 35, así que x = 35 ÷ 7 = 5 entradas. Comprueba: 7 × 5 + 4 = 39.' },
      { q: 'Para resolver 5x − 8 = 32, ¿cuál es el primer paso?', choices: ['Dividir los dos lados entre 5', 'Sumar 8 a los dos lados', 'Quitar 8 de los dos lados', 'Multiplicar los dos lados por 5'], hint: 'El − 8 fue lo último que se le hizo a x.', explain: 'Deshaz primero el último paso: suma 8 para obtener 5x = 40, y luego divide entre 5 para obtener x = 8.' }
    ]
  },
  'm7-forest-square-plots': {
    title: 'Parcelas cuadradas y raíces', topicName: 'Cuadrados y raíces', blurb: 'Planta árboles en cuadrículas cuadradas y halla el lado a partir del área.',
    reading: [
      { title: 'Números cuadrados', text: '9² («9 al cuadrado») significa 9 × 9 = 81. Un huerto cuadrado con 9 filas de 9 árboles tiene 81 árboles.' },
      { title: 'Raíces cuadradas', text: 'La raíz cuadrada va hacia atrás: √64 pregunta «¿qué número multiplicado por sí mismo da 64?». La respuesta es 8.' },
      { title: 'Áreas de cuadrados', text: 'Un claro cuadrado con lados de 7 m tiene un área de 7² = 49 m². Si sabes el área de un cuadrado, su lado es la raíz cuadrada del área.' }
    ],
    quiz: [
      { q: 'Un huerto cuadrado tiene 6 filas de 6 manzanos. ¿Cuántos árboles son?', choices: ['12', '36', '66'], hint: '6 filas de 6 es 6².', explain: '6² = 6 × 6 = 36 árboles.' },
      { q: 'Un prado cuadrado tiene un área de 100 m². ¿Cuánto mide cada lado?', choices: ['10 m', '50 m', '25 m'], hint: '¿Qué número multiplicado por sí mismo da 100?', explain: '10 × 10 = 100, así que √100 = 10 y cada lado mide 10 m.' },
      { q: '¿Cuánto es 11²?', choices: ['22', '111', '121'], hint: '11² significa 11 × 11, no 11 × 2.', explain: '11 × 11 = 121.' },
      { q: 'Los observadores de estrellas ponen una alfombra cuadrada de 144 baldosas en lo alto del árbol. ¿Cuántas baldosas hay en cada lado?', choices: ['72', '14', '12', '24'], hint: '¿Qué número multiplicado por sí mismo da 144?', explain: '12 × 12 = 144, así que hay 12 baldosas en cada lado.' },
      { q: '¿Cuál de estos es un número cuadrado?', choices: ['81', '40', '50', '90'], hint: 'Busca un número que sea algo multiplicado por sí mismo.', explain: '81 = 9 × 9, así que es un número cuadrado. 40, 50 y 90 no lo son: 6² = 36, 7² = 49, 8² = 64 y 9² = 81.' }
    ]
  },

  // ───────── Historia del bosque ─────────
  // ── Anillo 1: Hueco de las Raíces ──
  'h1-forest-woodland-life': {
    title: "Vivir en el bosque hace mucho tiempo",
    topicName: "La vida en el bosque hace mucho tiempo",
    blurb: "Recoge nueces, construye un refugio y aprende las estaciones con una familia del bosque de hace mucho tiempo.",
    reading: [
      { title: "Una casa en el bosque", text: "Hace muchísimo tiempo, mucha gente vivía en los bosques o cerca de ellos. Construían refugios con ramas, troncos y corteza." },
      { title: "Recoger comida", text: "La gente recogía nueces, bayas, hongos y raíces. Las avellanas y las bellotas eran buenos alimentos para guardar para el invierno." },
      { title: "Madera para todo", text: "Con la madera hacían fuego, tazones, cucharas y herramientas. Con la corteza de los árboles hacían cajas, cestas ¡y hasta cuerdas!" },
      { title: "Mirar las estaciones", text: "La gente conocía muy bien el bosque. Sabían cuándo estaban maduras las bayas en verano y cuándo caían las nueces en otoño." }
    ],
    dialogue: {
      npc: { name: "Avellana", role: "una recolectora del bosque de hace mucho tiempo" },
      intro: "¡Hola, pequeño o pequeña! Soy Avellana. Mi familia y yo vivimos aquí, en el bosque. ¡Ven a ayudarme a llenar mi cesta de nueces!",
      topics: [
        { ask: "¿De qué está hecha tu casa?", answer: "De palos de madera apoyados unos en otros y cubiertos de corteza y ramas. Nos protege del viento y de la lluvia, y dentro mantenemos un fuego para no pasar frío." },
        { ask: "¿Qué comen?", answer: "¡Lo que nos da el bosque! Bayas en verano, nueces y hongos en otoño, y también raíces y pescado. Tostamos avellanas junto al fuego. ¡Qué rico!" },
        { ask: "¿Por qué guardas tantas nueces?", answer: "Se acerca el invierno, y entonces hay muy poco que recoger. Las nueces duran mucho tiempo, así que las guardamos, ¡igual que las ardillas!" },
        { ask: "¿De verdad se pueden comer las bellotas?", answer: "Sí, pero al principio saben muy amargas. Las partimos y las dejamos en remojo en agua para quitarles el sabor amargo. Después las molemos para hacer harina." },
        { ask: "¿Qué haces con la corteza?", answer: "La corteza de abedul es ligera y no deja pasar el agua. La doblamos para hacer cajas y cestas, ¡y hasta podemos hacer vasos con ella!" }
      ],
      challenge: {
        q: "¿Por qué la gente de hace mucho tiempo guardaba nueces en otoño?",
        choices: ["Para tener comida en invierno", "Para tirárselas a las ardillas", "Para construir sus casas"],
        explain: "En invierno había muy poca comida que recoger, y las nueces duran mucho tiempo."
      },
      farewell: "¡Gracias por tu ayuda! Nuestra cesta está llena. ¡Que tengas buen camino por el bosque!"
    },
    timeline: {
      title: "La vida en el bosque a lo largo del tiempo",
      events: [
        { label: "Unos humanos antiguos encajan troncos en las cataratas de Kalambo, en África: la construcción de madera más antigua que conocemos", when: "hace unos 476 000 años" },
        { label: "Gente de una isla de Escocia tuesta enormes montones de avellanas", when: "hace unos 9000 años" },
        { label: "Un viajero de los Alpes, llamado Ötzi, lleva una caja hecha de corteza de abedul", when: "hace unos 5300 años" },
        { label: "Abren en Dinamarca los primeros jardines de infancia del bosque, donde los niños aprenden al aire libre", when: "la década de 1950" }
      ]
    },
    artifact: {
      name: "Una bellota",
      text: "Las bellotas son las semillas de los robles. Hace mucho tiempo, en muchas partes del mundo, la gente recogía bellotas, las dejaba en remojo para quitarles el sabor amargo y las molía para hacer harina. En Corea todavía se hace una gelatina de bellotas llamada dotori-muk."
    },
    quiz: [
      { q: "¿Con qué construía la gente de hace mucho tiempo sus refugios en el bosque?", choices: ["Con ladrillos y vidrio", "Con ramas, troncos y corteza", "Con metal y plástico"], hint: "Usaban lo que crecía en el bosque.", explain: "Construían sus refugios con ramas, troncos y corteza." },
      { q: "¿Qué alimentos recogía la gente en el bosque?", choices: ["Nueces, bayas y hongos", "Pizza y papas fritas", "Helado"], hint: "Crecen en los árboles, en los arbustos y en el suelo del bosque.", explain: "La gente recogía nueces, bayas, hongos y raíces." },
      { q: "¿Por qué la gente dejaba las bellotas en remojo?", choices: ["Para que flotaran", "Para que crecieran", "Para quitarles el sabor amargo"], hint: "Las bellotas crudas no saben bien.", explain: "El remojo les quitaba el sabor amargo, y así las bellotas se podían moler para hacer harina." },
      { q: "¿Qué cosas útiles hacía la gente con la corteza de abedul?", choices: ["Ventanas de vidrio", "Cajas y cestas", "Ollas de metal"], hint: "La corteza de abedul es ligera y se puede doblar.", explain: "La gente doblaba la corteza de abedul para hacer cajas, cestas y vasos." },
      { q: "¿Cuándo encontraba la gente más nueces para recoger?", choices: ["En invierno", "Al principio de la primavera", "A medianoche", "En otoño"], hint: "Piensa en cuándo caen las hojas y las nueces de los árboles.", explain: "Las nueces maduran y caen en otoño, así que esa era la época de recogerlas." }
    ]
  },
  'h1-forest-first-farms': {
    title: "Los primeros huertos y granjas",
    topicName: "Las primeras granjas",
    blurb: "Siembra las primeras semillas de todas y descubre cómo la gente se convirtió en agricultora.",
    reading: [
      { title: "Las semillas pueden crecer", text: "Hace mucho tiempo, la gente vio que las semillas que caían al suelo se convertían en plantas nuevas. ¡Así que empezaron a sembrar semillas a propósito!" },
      { title: "Los primeros cultivos", text: "Hace unos 11 000 años, la gente de Oriente Medio cultivaba trigo y cebada. Más tarde, en otros lugares, la gente cultivó arroz, maíz y papas." },
      { title: "Quedarse en un lugar", text: "Los agricultores tenían que cuidar sus campos, así que se quedaban en un mismo lugar. Construyeron casas muy juntas, y así nacieron las primeras aldeas." },
      { title: "Huertos para todos", text: "Hoy la gente sigue cultivando alimentos en granjas y huertos, y muchas escuelas también tienen huerto. ¡Todo empezó con unas pocas semillas!" }
    ],
    dialogue: {
      npc: { name: "Ama", role: "una de las primeras agricultoras, hace unos 10 000 años" },
      intro: "¡Hola! Soy Ama. Mira dónde pisas: ¡esos brotecitos verdes son mi trigo! ¿Quieres saber cómo cultivamos nuestra comida?",
      topics: [
        { ask: "¿Cómo aprendió la gente a cultivar?", answer: "¡Observando! Las semillas que caían cerca de nuestras casas se convertían en plantas nuevas. Así que guardamos las semillas más grandes y mejores y las sembramos. Cada año, nuestras cosechas son un poquito mejores." },
        { ask: "¿Qué cultivas?", answer: "Trigo y cebada, y también guisantes y lentejas. Molemos el grano entre dos piedras para hacer harina para el pan." },
        { ask: "¿Por qué ya no van de un lugar a otro?", answer: "¡Nuestros campos nos necesitan! Arrancamos las malas hierbas y espantamos a los animales hambrientos. Por eso construimos casas y nos quedamos. Ahora tenemos una aldea." },
        { ask: "¿También tienen animales?", answer: "Sí, tenemos ovejas y cabras. Nos dan leche y lana, ¡y son buena compañía!" }
      ],
      challenge: {
        q: "¿Qué hacían los primeros agricultores con las mejores semillas?",
        choices: ["Las tiraban", "Las guardaban y las sembraban", "Las pintaban"],
        explain: "Guardaban las semillas más grandes y mejores para volver a sembrarlas, y así sus cosechas eran cada vez mejores."
      },
      farewell: "¡Vuelve en la época de la cosecha y haremos pan juntos!"
    },
    timeline: {
      title: "Granjas y huertos a lo largo del tiempo",
      events: [
        { label: "La gente de Oriente Medio empieza a cultivar trigo y cebada", when: "hace unos 11 000 años" },
        { label: "La gente de México empieza a cultivar maíz", when: "hace unos 9000 años" },
        { label: "La gente de China ya cultiva arroz", when: "hace unos 8000 años" },
        { label: "El plano de un monasterio de Europa muestra huertos de hierbas y verduras, y un huerto de frutales", when: "hacia 820" },
        { label: "Friedrich Fröbel abre en Alemania el primer kindergarten, un «jardín de niños»", when: "1837" }
      ]
    },
    artifact: {
      name: "La tablilla de barro de un agricultor",
      text: "Hace unos 3700 años, la gente de Mesopotamia escribía consejos de agricultura en tablillas de barro. Un texto, que hoy se llama las Instrucciones del Agricultor, le explica a un agricultor cómo regar el campo, ararlo y cosechar la cebada."
    },
    quiz: [
      { q: "¿Qué cultivaban los primeros agricultores de Oriente Medio?", choices: ["Trigo y cebada", "Plátanos", "Chocolate"], hint: "Son cereales con los que se hace pan.", explain: "Los primeros agricultores de Oriente Medio cultivaban trigo y cebada, hace unos 11 000 años." },
      { q: "¿Por qué los agricultores se quedaban en un mismo lugar?", choices: ["No les gustaba caminar", "Tenían que cuidar sus campos", "Hacía demasiado frío para moverse"], hint: "Piensa en las malas hierbas y en los animales hambrientos.", explain: "Los campos hay que limpiarlos de malas hierbas y protegerlos, así que los agricultores se quedaban cerca y construían casas." },
      { q: "¿Qué surgió alrededor de las primeras granjas cuando la gente se quedó en un lugar?", choices: ["Grandes ciudades con autos", "Aeropuertos", "Aldeas"], hint: "Muchas casas juntas.", explain: "Los agricultores construyeron casas muy juntas, y así nacieron las primeras aldeas." },
      { q: "¿Qué cultivo sembró primero la gente de México?", choices: ["Arroz", "Maíz", "Trigo", "Manzanas"], hint: "Crece en tallos altos y muchas veces es amarillo.", explain: "La gente de México empezó a cultivar maíz hace unos 9000 años." },
      { q: "¿Qué hacían los agricultores con el grano?", choices: ["Vidrio", "Papel", "Harina para el pan"], hint: "Lo molían entre dos piedras.", explain: "Los agricultores molían el grano para hacer harina y con ella hacían pan." }
    ]
  },

  // ── Anillo 2: Ramas de Helecho ──
  'h2-forest-tree-to-paper': {
    title: "Del árbol al papel",
    topicName: "Cómo se hace el papel",
    blurb: "¿Cómo ayudó el nido de una avispa a convertir los árboles en el papel de tus libros?",
    reading: [
      { title: "El papel de hace mucho tiempo", text: "Hace mucho tiempo, el papel se hacía con trapos viejos, plantas y corteza de árbol. Se hacía a mano, hoja por hoja." },
      { title: "Una avispa muy lista", text: "Las avispas papeleras mastican madera hasta hacer una pasta blanda y la extienden muy fina para construir sus nidos. ¡Cuando se seca, es una especie de papel! Hace unos 300 años, un científico llamado René de Réaumur lo vio y escribió que la gente también podría hacer papel con madera." },
      { title: "De la madera a la pulpa", text: "En la década de 1840, unos inventores encontraron formas de moler la madera hasta convertirla en pulpa: una pasta mojada de fibras de madera diminutas. Extendían la pulpa muy fina y la secaban para hacer papel. Pronto el papel fue barato, y había libros y periódicos por todas partes." },
      { title: "Úsalo otra vez", text: "El papel viejo se puede remojar para volver a hacer pulpa y fabricar papel nuevo. Eso se llama reciclar. Los fabricantes de papel también plantan árboles nuevos para que crezca más madera." }
    ],
    dialogue: {
      npc: { name: "Hanna", role: "una papelera en una fábrica de papel, década de 1880" },
      intro: "¡Bienvenido a la fábrica de papel! Soy Hanna. ¡Escucha cómo zumban las máquinas! ¿Quieres ver cómo un tronco se convierte en una hoja de papel?",
      topics: [
        { ask: "¿Cómo se hace papel con un árbol?", answer: "Primero les quitamos la corteza a los troncos. Luego molemos la madera hasta hacer fibras diminutas y las mezclamos con agua para hacer pulpa. Extendemos la pulpa muy fina sobre una rejilla, le escurrimos el agua y la secamos. ¡Y ya es papel!" },
        { ask: "¿Con qué se hacía el papel antes?", answer: "¡Con trapos viejos de algodón y de lino! La gente juntaba ropa vieja y la vendía a las fábricas de papel. Pero nunca había suficientes trapos, así que el papel era caro." },
        { ask: "¿A quién se le ocurrió usar madera?", answer: "Un científico llamado René de Réaumur vio a unas avispas masticando madera para construir sus nidos de papel. ¡Dijo que la gente podía hacer lo mismo! Muchos años después, unos inventores fabricaron máquinas que molían la madera hasta hacer pulpa." },
        { ask: "¿Por qué es importante que el papel sea barato?", answer: "Cuando el papel es barato, todo el mundo puede tener libros, periódicos y cuadernos. ¡Más niños y niñas pueden aprender a leer y a escribir!" }
      ],
      challenge: {
        q: "¿Qué animal le dio a la gente la idea de hacer papel con madera?",
        choices: ["Un castor", "Una avispa", "Un pájaro carpintero"],
        explain: "Las avispas papeleras mastican madera hasta hacer una pasta para construir sus nidos. René de Réaumur se dio cuenta y dijo que la gente también podría hacer papel con madera."
      },
      farewell: "La próxima vez que hagas un dibujo, recuerda: ¡tu papel fue antes parte de un árbol!"
    },
    timeline: {
      title: "El papel a lo largo del tiempo",
      events: [
        { label: "En China, Cai Lun enseña una forma mejor de hacer papel", when: "105 d. C." },
        { label: "René de Réaumur se da cuenta de que las avispas hacen papel con madera", when: "1719" },
        { label: "Unos inventores muelen madera hasta hacer pulpa para fabricar papel", when: "la década de 1840" },
        { label: "Ya casi todo el papel nuevo se hace con madera", when: "hacia 1900" },
        { label: "Un estudiante diseña el símbolo del reciclaje con tres flechas", when: "1970" }
      ]
    },
    artifact: {
      name: "Una hoja de papel hecho a mano",
      text: "Esta hoja se hizo a mano. El papelero metió una rejilla en una tina llena de pulpa, la sacó y dejó escurrir el agua. Las fibras que quedaron sobre la rejilla se secaron y formaron una hoja de papel."
    },
    quiz: [
      { q: "¿Qué es la pulpa de papel?", choices: ["Una pasta mojada de fibras diminutas", "Un tipo de pegamento", "Un tipo de tinta"], hint: "Es blanda y mojada, y se hace con madera o con trapos.", explain: "La pulpa es una pasta mojada de fibras diminutas. Si se extiende fina y se seca, se convierte en papel." },
      { q: "Antes de usar madera, ¿con qué se hacía casi todo el papel en Europa?", choices: ["Con plástico", "Con trapos viejos", "Con piedras"], hint: "La gente vendía su ropa vieja a las fábricas de papel.", explain: "Casi todo el papel de Europa se hacía con trapos viejos de algodón y de lino." },
      { q: "¿Quién se dio cuenta de que las avispas hacen papel con madera?", choices: ["René de Réaumur", "Cai Lun", "Cristóbal Colón"], hint: "Fue un científico de hace unos 300 años.", explain: "René de Réaumur observó a las avispas papeleras y dijo que la gente también podría hacer papel con madera." },
      { q: "¿Cómo se llama convertir papel viejo en papel nuevo?", choices: ["Imprimir", "Pintar", "Reciclar"], hint: "Busca la palabra que significa volver a usar las cosas.", explain: "Convertir papel viejo en papel nuevo se llama reciclar." },
      { q: "¿Por qué era tan importante que el papel fuera barato?", choices: ["Los árboles crecían más rápido", "Las avispas hacían nidos más grandes", "El papel pesaba más", "Más gente podía tener libros y aprender a leer"], hint: "Piensa en los libros, los periódicos y los cuadernos.", explain: "Cuando el papel era barato, mucha más gente podía tener libros y periódicos, y más niños y niñas aprendían a leer y a escribir." }
    ]
  },
  'h2-forest-oldest-trees': {
    title: "Los árboles más viejos de la Tierra",
    topicName: "Árboles muy antiguos",
    blurb: "Conoce un pino que tiene casi 5000 años y los bosques que la gente ha cuidado.",
    reading: [
      { title: "Muy, muy viejos", text: "Algunos árboles viven miles de años. Un pino longevo llamado Matusalén, en las montañas de California, tiene unos 4850 años. ¡Empezó a crecer antes de que se construyera la Gran Pirámide de Egipto!" },
      { title: "Arbolitos resistentes", text: "Los pinos longevos crecen en lo alto de montañas secas, frías y con mucho viento. Crecen muy despacio. Su madera es dura y está llena de resina pegajosa, que ayuda a protegerla de la podredumbre y de los insectos." },
      { title: "Contar anillos", text: "Los científicos no cortan los árboles viejos para contar sus anillos. Usan un taladro fino y hueco para sacar un cilindro de madera delgado como un lápiz, y cuentan los anillos que hay en él." },
      { title: "Bosques sagrados", text: "En muchas partes del mundo, la gente ha protegido durante cientos de años unos bosques especiales llamados bosques sagrados. Solo en la India hay miles, y en ellos los árboles viejos, las plantas y los animales están a salvo." }
    ],
    dialogue: {
      npc: { name: "Enebro", role: "una guardabosques de las Montañas Blancas de California" },
      intro: "¡Hola y bienvenido al bosque antiguo! Soy Enebro, guardabosques. Camina en silencio: ¡algunos de estos árboles son más viejos que las pirámides!",
      topics: [
        { ask: "¿Cuál es el árbol más viejo?", answer: "Aquí hay un pino longevo llamado Matusalén que tiene unos 4850 años. Mantenemos en secreto cuál es exactamente, para protegerlo de que vengan demasiados visitantes." },
        { ask: "¿Cómo sabes cuántos años tiene un árbol?", answer: "¡Contamos sus anillos! Cada año, el árbol añade un anillo de madera. Sacamos un cilindro fino con un taladro especial y luego contamos los anillos con una lupa. El árbol cierra pronto el agujerito." },
        { ask: "¿Por qué estos árboles viven tanto?", answer: "Crecen muy despacio en las montañas frías y secas. Su madera está repleta de resina pegajosa, así que a la podredumbre y a los insectos les cuesta mucho entrar. ¡Despacito y con buena letra!" },
        { ask: "¿Hay otros árboles muy viejos?", answer: "¡Muchos! Una higuera sagrada de Sri Lanka se plantó hace más de 2300 años, y la gente todavía la cuida. Y en Suecia, un pequeño abeto llamado el Viejo Tjikko crece de unas raíces que tienen unos 9500 años." }
      ],
      challenge: {
        q: "¿Cómo averiguan los científicos la edad de un árbol viejo sin cortarlo?",
        choices: ["Le piden a la guardabosques que lo adivine", "Cuentan los anillos de un cilindro fino de madera", "Miden sus hojas"],
        explain: "Sacan con un taladro un cilindro de madera delgado como un lápiz y cuentan sus anillos. Normalmente, un anillo es un año."
      },
      farewell: "Gracias por caminar con cuidado. Cuida los árboles, ¡y puede que sigan aquí dentro de otros mil años!"
    },
    timeline: {
      title: "Árboles antiguos a lo largo del tiempo",
      events: [
        { label: "Empiezan a crecer las raíces del Viejo Tjikko, un abeto de Suecia", when: "hace unos 9500 años" },
        { label: "Empieza a crecer el pino longevo llamado Matusalén", when: "hacia 2833 a. C." },
        { label: "Se planta una higuera sagrada en Anuradhapura, Sri Lanka", when: "288 a. C." },
        { label: "Edmund Schulman cuenta los anillos de Matusalén: tiene más de 4700 años", when: "1957" },
        { label: "Unos científicos descubren cuántos años tienen las raíces del Viejo Tjikko", when: "2008" }
      ]
    },
    artifact: {
      name: "Una rodaja de tronco con anillos",
      text: "Cada anillo de esta rodaja de madera es un año de la vida del árbol. Los anillos anchos son años buenos y lluviosos, en los que el árbol creció mucho. Los anillos finos son años secos o fríos. ¡Los anillos de los árboles son como un diario del tiempo!"
    },
    quiz: [
      { q: "¿Cuántos años tiene, más o menos, el pino longevo llamado Matusalén?", choices: ["Unos 50 años", "Unos 4850 años", "Alrededor de 1 millón de años"], hint: "Es más viejo que la Gran Pirámide.", explain: "Matusalén tiene unos 4850 años. Empezó a crecer antes de que se construyera la Gran Pirámide." },
      { q: "¿Qué representa normalmente un anillo de un árbol?", choices: ["Un año", "Un día", "Cien años"], hint: "El árbol añade un anillo cada primavera y verano.", explain: "Cada año, un árbol forma un anillo nuevo de madera." },
      { q: "¿Por qué los pinos longevos viven tanto?", choices: ["Los pintan cada año", "Crecen rápido con la lluvia cálida", "Crecen despacio y su madera está llena de resina"], hint: "¡Despacito y con buena letra!", explain: "Crecen muy despacio, y su madera llena de resina los protege de la podredumbre y de los insectos." },
      { q: "¿Qué es un bosque sagrado?", choices: ["Un tipo de fruta", "Un bosque especial que la gente protege", "Un edificio muy alto"], hint: "Es un lugar lleno de árboles.", explain: "Un bosque sagrado es un bosque especial que la gente ha protegido, muchas veces durante cientos de años." },
      { q: "¿Qué te dice un anillo muy fino?", choices: ["Fue un año muy lluvioso y cálido", "Cortaron el árbol", "Un pájaro hizo un nido", "Fue un año seco o frío, así que el árbol creció poco"], hint: "Un anillo fino quiere decir que el árbol no creció mucho.", explain: "Los anillos finos muestran años secos o fríos, en los que el árbol creció muy poco." }
    ]
  },

  // ── Anillo 3: Ramas de Farolillos ──
  'h3-forest-johnny-appleseed': {
    title: "Johnny Appleseed",
    topicName: "Johnny Appleseed",
    blurb: "Camina hacia el oeste con John Chapman y planta manzanos para las familias que llegarán.",
    reading: [
      { title: "Una persona de verdad", text: "Johnny Appleseed («Juanito Semilla de Manzana») fue un hombre de verdad llamado John Chapman. Nació en Massachusetts, en los Estados Unidos, en 1774." },
      { title: "Viveros de manzanos", text: "John recogía semillas de manzana en los molinos de sidra, donde aplastaban las manzanas para sacarles el jugo. Sembraba las semillas en pequeñas parcelas cercadas llamadas viveros, antes de que llegaran los colonos que iban hacia el oeste." },
      { title: "Listos para las familias nuevas", text: "Cuando las familias llegaban para hacer sus granjas, los manzanos jóvenes de John ya estaban listos. Los vendía por unos pocos centavos cada uno, o los cambiaba por comida o ropa." },
      { title: "Historias y leyendas", text: "La gente cuenta muchas historias sobre él: que muchas veces caminaba descalzo y que era bueno con los animales. ¡Algunas, como que llevaba una olla de cocina como sombrero, puede que sean inventadas!" }
    ],
    dialogue: {
      npc: { name: "John Chapman", role: "el plantador de manzanos conocido como Johnny Appleseed" },
      intro: "¡Buenas, amigo! Soy John Chapman, pero la gente me llama Johnny Appleseed. Tengo un saco de semillas de manzana y un largo camino por delante. ¿Caminas conmigo?",
      topics: [
        { ask: "¿De dónde sacas tus semillas?", answer: "¡De los molinos de sidra! Cuando la gente aplasta las manzanas para hacer sidra, las semillas se quedan en la pulpa. Yo las lavo, las seco y las llevo en un saco." },
        { ask: "¿Por qué plantas manzanos?", answer: "Hay familias que se mudan al oeste para hacer granjas nuevas. Un manzano tarda años en crecer, así que planto viveros antes de que lleguen. ¡Cuando llegan, los arbolitos ya están listos para ellos!" },
        { ask: "¿Todas las semillas dan las mismas manzanas?", answer: "¡No! Cada semilla de manzana se convierte en un tipo de manzano diferente. Muchas de mis manzanas son pequeñas y ácidas, pero sirven para hacer sidra, mermelada de manzana y para secarlas para el invierno." },
        { ask: "¿Es verdad que quieres mucho a los animales?", answer: "Intento ser bueno con todas las criaturas. La gente cuenta que una vez apagué mi fogata para que los bichos no se metieran volando en ella. ¡Es una de las historias que cuentan de mí!" }
      ],
      challenge: {
        q: "¿Cuál era el nombre de verdad de Johnny Appleseed?",
        choices: ["John Chapman", "John Muir", "John Smith"],
        explain: "Johnny Appleseed era el apodo de John Chapman, un plantador de manzanos que existió de verdad."
      },
      farewell: "¡Gracias por caminar conmigo! Cada vez que comas una manzana, recuerda: todo árbol empieza con una semillita."
    },
    timeline: {
      title: "La vida de Johnny Appleseed",
      events: [
        { label: "John Chapman nace en Massachusetts", when: "1774" },
        { label: "Planta viveros de manzanos en Pensilvania", when: "hacia 1797" },
        { label: "Lleva sus semillas hacia el oeste, hasta Ohio", when: "principios del siglo XIX" },
        { label: "Planta viveros en Indiana", when: "la década de 1830" },
        { label: "John Chapman muere en Indiana, a los 70 años", when: "1845" },
        { label: "Un relato en una revista hace famoso a «Johnny Appleseed» en todo Estados Unidos", when: "1871" }
      ]
    },
    artifact: {
      name: "Una moneda de un centavo",
      text: "John Chapman vendía sus manzanos jóvenes por solo unos pocos centavos cada uno. Si una familia no tenía dinero, muchas veces aceptaba comida o ropa vieja a cambio."
    },
    quiz: [
      { q: "¿De dónde sacaba John Chapman sus semillas de manzana?", choices: ["De una tienda", "De los molinos de sidra", "Del mar"], hint: "Las semillas sobraban después de aplastar las manzanas.", explain: "Recogía las semillas que sobraban en los molinos de sidra, donde aplastaban las manzanas para sacarles el jugo." },
      { q: "¿Qué es un vivero de manzanos?", choices: ["Un lugar donde se siembran y crecen árboles jóvenes", "Un hospital para manzanas", "Un tipo de pastel de manzana"], hint: "Allí crecen los árboles jóvenes hasta que están listos.", explain: "Un vivero es una parcela donde crecen árboles jóvenes hasta que están listos para plantarlos en otro sitio." },
      { q: "¿Por qué plantaba árboles antes de que llegaran los colonos?", choices: ["Para esconderse de ellos", "Para hacer un laberinto", "Los manzanos tardan años en crecer, así que estarían listos cuando llegaran las familias"], hint: "Piensa en cuánto tarda en crecer un árbol.", explain: "Los manzanos tardan años en crecer, así que sus arbolitos estaban listos cuando llegaban las familias." },
      { q: "¿Una semilla de manzana da el mismo tipo de manzana que la manzana de la que salió?", choices: ["Sí, siempre", "No, cada semilla da un tipo de manzana diferente"], hint: "Las manzanas de Johnny muchas veces eran pequeñas y ácidas.", explain: "Cada semilla de manzana se convierte en un manzano nuevo y diferente." },
      { q: "¿Qué historia sobre Johnny Appleseed puede que sea inventada?", choices: ["Plantaba manzanos", "Nació en 1774", "Vendía árboles jóvenes", "Llevaba una olla de cocina como sombrero"], hint: "¿Cuál suena más disparatada?", explain: "Sí que plantaba y vendía manzanos, y nació en 1774. Lo del sombrero-olla seguramente es una leyenda." }
    ]
  },
  'h3-forest-maple-syrup': {
    title: "La dulce historia del jarabe de arce",
    topicName: "El jarabe de arce",
    blurb: "Saca savia de un arce en una mañana helada de primavera y descubre quién hizo azúcar de arce por primera vez.",
    reading: [
      { title: "Savia dulce", text: "Los arces guardan azúcar en el tronco y en las raíces durante el invierno. Al principio de la primavera, una savia dulce y aguada empieza a moverse por dentro del árbol." },
      { title: "Noches frías, días templados", text: "La savia corre mejor cuando por la noche hace menos de cero grados y de día hace más de cero. Por eso los que hacen azúcar de arce miran el tiempo con tanta atención." },
      { title: "Los primeros que hicieron azúcar", text: "Los pueblos indígenas de América del Norte, como los anishinaabe y los haudenosaunee, hacían azúcar de arce mucho antes de que llegaran los europeos. Ellos les enseñaron a los colonos a hacerlo." },
      { title: "¡Hervir, hervir y hervir!", text: "La savia es casi toda agua. Hacen falta unos 40 litros de savia, hervida durante horas, para hacer solo 1 litro de jarabe de arce." }
    ],
    dialogue: {
      npc: { name: "Elise", role: "una productora de azúcar de arce en Quebec" },
      intro: "¡Bonjour! Soy Elise. ¡Bienvenido a nuestra cabaña de azúcar! ¿Hueles el vapor dulce? ¡Hoy está corriendo la savia!",
      topics: [
        { ask: "¿Cómo se saca la savia de un árbol?", answer: "Hacemos un agujerito en el tronco y le ponemos un caño. La savia gotea en un cubo o corre por un tubo. El árbol tiene savia de sobra, y el agujerito se cura." },
        { ask: "¿Quién hizo jarabe de arce por primera vez?", answer: "¡Los pueblos indígenas de estos bosques! Hacían cortes en la corteza, recogían la savia y la hervían hasta convertirla en azúcar mucho antes de que llegaran los europeos. Les enseñaron a los colonos, y todavía se lo agradecemos." },
        { ask: "¿Por qué solo en primavera?", answer: "La savia corre cuando las noches son heladas y los días templados. Cuando se abren los brotes, la savia empieza a saber amarga y se acaba la temporada." },
        { ask: "¿Cuánta savia hace falta para el jarabe?", answer: "¡Unos 40 litros de savia dan solo 1 litro de jarabe! Hervimos casi toda el agua hasta que se evapora. Por eso el jarabe de arce es tan valioso." }
      ],
      challenge: {
        q: "¿Más o menos cuántos litros de savia hacen falta para hacer 1 litro de jarabe de arce?",
        choices: ["1 litro", "Unos 40 litros", "Unos 1000 litros"],
        explain: "La savia es casi toda agua, así que hacen falta unos 40 litros de savia, bien hervida, para hacer 1 litro de jarabe."
      },
      farewell: "¡Vuelve la próxima primavera! Echaremos jarabe caliente sobre la nieve y lo enrollaremos en un palito. ¡Se llama caramelo de arce!"
    },
    timeline: {
      title: "El jarabe de arce a lo largo del tiempo",
      events: [
        { label: "Los pueblos indígenas ya hacen azúcar de arce", when: "hacia 1600, y mucho antes" },
        { label: "Los colonos europeos aprenden de los pueblos indígenas a hacer azúcar de arce", when: "el siglo XVIII" },
        { label: "Los cubos de metal, los caños y las bandejas planas para hervir facilitan el trabajo", when: "finales del siglo XIX" },
        { label: "Canadá pone una hoja de arce roja en su bandera", when: "1965" },
        { label: "Muchos productores empiezan a usar tubos de plástico para llevar la savia", when: "la década de 1970" }
      ]
    },
    artifact: {
      name: "Una rodaja de tronco de arce",
      text: "La savia sube y baja por los anillos de fuera del tronco, justo debajo de la corteza. Por eso el agujero para sacar savia solo tiene que tener unos pocos centímetros de profundidad. Los productores hacen cada agujero nuevo en un lugar distinto, para que el árbol siga sano."
    },
    quiz: [
      { q: "¿Cuándo corre mejor la savia del arce?", choices: ["Cuando las noches son heladas y los días templados", "En pleno verano caluroso", "En medio de una tormenta de nieve"], hint: "Necesita frío y también calorcito.", explain: "La savia corre mejor al principio de la primavera, cuando de noche hace menos de cero grados y de día más de cero." },
      { q: "¿Quién hizo azúcar de arce por primera vez?", choices: ["Los antiguos romanos", "Los pueblos indígenas de América del Norte", "Los vikingos"], hint: "Vivían en los bosques de arces mucho antes de que llegaran los europeos.", explain: "Los pueblos indígenas de América del Norte hacían azúcar de arce mucho antes de que llegaran los europeos, y se lo enseñaron a los colonos." },
      { q: "¿Por qué se hierve la savia durante tanto tiempo?", choices: ["Para que se evapore casi toda el agua", "Para enfriarla", "Para que se ponga azul"], hint: "La savia es casi toda agua.", explain: "Al hervirla se va casi toda el agua y queda el jarabe espeso y dulce." },
      { q: "¿Qué país tiene una hoja de arce en su bandera?", choices: ["Japón", "Brasil", "Canadá", "Kenia"], hint: "Está en América del Norte, al norte de los Estados Unidos.", explain: "La bandera de Canadá tiene una hoja de arce roja desde 1965." },
      { q: "¿Cómo sale la savia del árbol?", choices: ["Se corta el árbol", "Por un agujerito con un caño", "Gotea de las hojas"], hint: "Los productores quieren que el árbol siga sano.", explain: "Los productores hacen un agujerito, le ponen un caño y dejan que la savia gotee. El árbol sigue sano." }
    ]
  },

  // ── Anillo 4: Copa en Flor ──
  'h4-forest-linnaeus': {
    title: "Carlos Linneo pone nombre a las plantas",
    topicName: "Carlos Linneo y los nombres de las plantas",
    blurb: "Dale a cada planta un nombre de dos partes con el botánico que ordenó el mundo de los seres vivos.",
    reading: [
      { title: "Nombres largos y enredados", text: "Antes del siglo XVIII, las plantas muchas veces tenían nombres largos en latín que las describían con muchas palabras. Libros distintos usaban nombres distintos para la misma planta. ¡Era un lío!" },
      { title: "Con dos nombres basta", text: "El científico sueco Carlos Linneo le dio a cada planta un nombre corto de dos partes: el nombre de su grupo y un nombre propio. La margarita común pasó a llamarse Bellis perennis. Los científicos todavía usan su sistema hoy." },
      { title: "Ordenar por las flores", text: "Linneo ordenaba las plantas en grupos contando las partes de sus flores, como los estambres, que llevan el polen." },
      { title: "Nombres también para los animales", text: "También les puso nombre a los animales. Incluso les dio a los seres humanos su nombre científico: Homo sapiens, que significa «humano sabio»." }
    ],
    dialogue: {
      npc: { name: "Carlos Linneo", role: "un botánico sueco que puso nombre a plantas y animales" },
      intro: "¡God dag! Soy Carlos Linneo, de Suecia. He pasado mi vida ordenando plantas y poniéndoles nombre. ¿Me has traído una flor para mirarla?",
      topics: [
        { ask: "¿Por qué las plantas necesitan nombres científicos?", answer: "Una planta puede tener un nombre de todos los días distinto en cada idioma, ¡y hasta en cada pueblo! Un nombre científico es el mismo en todo el mundo, así que los científicos de cualquier lugar saben de qué planta hablas." },
        { ask: "¿Cómo funciona un nombre de dos partes?", answer: "Piensa en tu propio nombre: tienes un apellido de familia y un nombre solo tuyo. Bellis es el grupo de la margarita, y perennis quiere decir que vuelve a salir año tras año. Juntos, Bellis perennis solo puede ser la margarita común." },
        { ask: "¿Dónde encontrabas tus plantas?", answer: "¡En todas partes! De joven viajé a Laponia, en el extremo norte, para estudiar sus plantas. Más tarde, mis alumnos navegaron por todo el mundo y me mandaban semillas y plantas prensadas." },
        { ask: "¿De verdad pensaste en un reloj de flores?", answer: "¡Tuve la idea! Distintas flores se abren y se cierran a distintas horas del día. Si las plantaras en el orden correcto, podrías saber la hora mirando qué flores están abiertas." }
      ],
      challenge: {
        q: "¿Cuántas partes tiene un nombre científico de Linneo?",
        choices: ["Una", "Dos", "Diez"],
        explain: "Cada nombre tiene dos partes, el nombre del grupo y un nombre propio, como Bellis perennis para la margarita común."
      },
      farewell: "Sigue mirando de cerca cada flor. ¡Todavía hay muchas plantas esperando un nombre!"
    },
    timeline: {
      title: "La vida de Carlos Linneo",
      events: [
        { label: "Carlos Linneo nace en Suecia", when: "1707" },
        { label: "Viaja a Laponia para estudiar sus plantas", when: "1732" },
        { label: "Publica Systema Naturae, un libro que ordena la naturaleza en grupos", when: "1735" },
        { label: "Su libro Species Plantarum da nombres de dos partes a miles de plantas", when: "1753" },
        { label: "Les da a los seres humanos el nombre de Homo sapiens", when: "1758" }
      ]
    },
    artifact: {
      name: "Una lupa de mano",
      text: "Linneo contaba las partes diminutas de las flores para ordenar las plantas en grupos. Una lupa pequeña, llamada lupa de mano, te ayuda a ver con claridad los estambres y las demás partes de la flor."
    },
    quiz: [
      { q: "¿De qué país era Carlos Linneo?", choices: ["Suecia", "Brasil", "Egipto"], hint: "Viajó a Laponia, en el extremo norte de su propio país.", explain: "Carlos Linneo era de Suecia." },
      { q: "¿Cuál es el nombre científico de la margarita común?", choices: ["Margarita margarita", "Homo sapiens", "Bellis perennis"], hint: "Su segunda parte quiere decir que vuelve a salir año tras año.", explain: "La margarita común es Bellis perennis. Homo sapiens es el nombre de los seres humanos." },
      { q: "¿Por qué son útiles los nombres científicos?", choices: ["Riman", "Son los mismos en todo el mundo", "Son muy largos"], hint: "Los nombres de todos los días cambian de un idioma a otro.", explain: "Un nombre científico es el mismo en todas partes, así que los científicos de todo el mundo saben de qué planta se trata." },
      { q: "¿Qué significa Homo sapiens?", choices: ["Árbol alto", "Abeja trabajadora", "Corredor veloz", "Humano sabio"], hint: "Es el nombre que Linneo les dio a las personas.", explain: "Homo sapiens significa «humano sabio». Es nuestro propio nombre científico." },
      { q: "¿Cómo ordenaba Linneo las plantas en grupos?", choices: ["Por su olor", "Contando las partes de sus flores", "Por el color de sus macetas"], hint: "Miraba con atención dentro de las flores.", explain: "Ordenaba las plantas contando las partes de sus flores, como los estambres." }
    ]
  },
  'h4-forest-botanic-gardens': {
    title: "Los primeros jardines botánicos",
    topicName: "Los jardines botánicos",
    blurb: "De Padua a Kew: jardines donde los científicos cultivan plantas de todo el mundo.",
    reading: [
      { title: "Jardines para aprender", text: "Un jardín botánico cultiva plantas para que la gente pueda estudiarlas. Los primeros, en Italia en la década de 1540, cultivaban plantas medicinales para los estudiantes que aprendían a ser médicos." },
      { title: "Los Jardines de Kew", text: "En 1759 se empezó un jardín en Kew, cerca de Londres. Se convirtió en uno de los jardines botánicos más grandes del mundo, con decenas de miles de tipos de plantas." },
      { title: "Plantas de viaje", text: "Las plantas muchas veces se morían en los largos viajes por mar. Hacia 1829, Nathaniel Ward descubrió que las plantas podían vivir meses dentro de una caja de vidrio cerrada. Pronto estas cajas de Ward llevaron plantas vivas por todo el mundo." },
      { title: "Un banco de semillas", text: "El Banco de Semillas del Milenio de Kew guarda miles de millones de semillas, secas y congeladas, de plantas de todo el mundo. Si una planta llega a ser rara, sus semillas están a salvo." }
    ],
    dialogue: {
      npc: { name: "Priya", role: "una jardinera de los Jardines de Kew" },
      intro: "¡Hola y bienvenido a Kew! Soy Priya y trabajo aquí como jardinera. ¿Empezamos por la Casa de las Palmeras? ¡Dentro hace tanto calor como en una selva tropical!",
      topics: [
        { ask: "¿Para qué sirve un jardín botánico?", answer: "Cultivamos plantas para que la gente aprenda sobre ellas: científicos, estudiantes y visitantes como tú. Estudiamos las plantas, les ponemos nombre a las nuevas y ayudamos a proteger las raras." },
        { ask: "¿Qué es la Casa de las Palmeras?", answer: "Es un invernadero gigante, terminado en 1848. El vidrio deja entrar la luz del sol y guarda el calor dentro, así que las plantas tropicales, como las palmeras, pueden crecer aquí en el frío Londres." },
        { ask: "¿Cómo viajaban las plantas hace mucho tiempo?", answer: "¡En cajas de vidrio cerradas llamadas cajas de Ward! La caja no dejaba escapar el agua, así que las plantas seguían vivas en los largos viajes por mar. Antes de eso, muchas se morían por el camino." },
        { ask: "¿Qué es un banco de semillas?", answer: "Es como un banco, ¡pero de semillas! Las secamos y las guardamos congeladas. Así, muchas semillas pueden seguir vivas durante muchísimo tiempo, listas para volver a crecer." }
      ],
      challenge: {
        q: "¿Para qué le sirvieron a la gente las cajas de Ward?",
        choices: ["Para llevar plantas vivas en viajes largos", "Para hacer papel", "Para contar los anillos de los árboles"],
        explain: "Una caja de Ward de vidrio cerrada no dejaba escapar el agua, así que las plantas podían seguir vivas durante meses en el mar."
      },
      farewell: "¡Gracias por tu visita! Cuando siembras una semilla en casa, tú también eres un pequeño jardinero botánico."
    },
    timeline: {
      title: "Los jardines botánicos a lo largo del tiempo",
      events: [
        { label: "Abre en Padua, Italia, un jardín botánico para estudiantes", when: "1545" },
        { label: "Se empieza un jardín en Kew, cerca de Londres", when: "1759" },
        { label: "Nathaniel Ward descubre que las plantas pueden vivir dentro de una caja de vidrio cerrada", when: "hacia 1829" },
        { label: "Se termina la gran Casa de las Palmeras de Kew", when: "1848" },
        { label: "Abre el Banco de Semillas del Milenio de Kew", when: "2000" },
        { label: "Los Jardines de Kew pasan a ser Patrimonio de la Humanidad", when: "2003" }
      ]
    },
    artifact: {
      name: "Un globo terráqueo del mundo de las plantas",
      text: "Los jardines botánicos reúnen plantas de todo el mundo. Los jardineros necesitan saber de dónde viene cada planta para darle el calor, la luz y el agua que necesita. ¡Una planta de la selva tropical necesita un invernadero cálido y húmedo!"
    },
    quiz: [
      { q: "¿Para qué sirve un jardín botánico?", choices: ["Para guardar autos", "Para cultivar plantas y que la gente pueda estudiarlas", "Para vender juguetes"], hint: "Allí aprenden científicos y estudiantes.", explain: "Un jardín botánico cultiva plantas para que la gente pueda estudiarlas y protegerlas." },
      { q: "¿Por qué pueden crecer palmeras en la Casa de las Palmeras, en el frío Londres?", choices: ["El vidrio deja entrar la luz y guarda el calor dentro", "Está en la Luna", "Las palmeras llevan abrigo"], hint: "Piensa en lo que hace el vidrio.", explain: "El vidrio deja entrar la luz del sol y guarda el calor dentro, como un invernadero gigante." },
      { q: "¿Qué es un banco de semillas?", choices: ["Un banco que te paga con semillas", "Un banco del parque cubierto de semillas", "Un lugar donde las semillas se secan, se congelan y se guardan a salvo"], hint: "Guarda las semillas a salvo para el futuro.", explain: "Un banco de semillas seca y congela las semillas para que sigan vivas durante muchísimo tiempo." },
      { q: "¿En qué país estaban los primeros jardines botánicos para estudiantes?", choices: ["Japón", "Perú", "Canadá", "Italia"], hint: "Piensa en Padua.", explain: "Los primeros jardines botánicos para estudiantes abrieron en Italia, en Pisa y en Padua, en la década de 1540." },
      { q: "¿Por qué los primeros jardines botánicos cultivaban plantas medicinales?", choices: ["Para los estudiantes que aprendían a ser médicos", "Solo para adornar", "Para dar de comer a los caballos"], hint: "¿Quién estudiaba allí?", explain: "Los estudiantes que aprendían a ser médicos necesitaban saber qué plantas se podían usar como medicinas." }
    ]
  },

  // ── Anillo 5: Altos del Nido ──
  'h5-forest-john-muir': {
    title: "John Muir y los parques nacionales",
    topicName: "John Muir y los parques nacionales",
    blurb: "Sube a los acantilados de granito de Yosemite con el naturalista que ayudó a proteger los lugares salvajes.",
    reading: [
      { title: "Un niño que amaba la naturaleza", text: "John Muir nació en Escocia en 1838. Cuando tenía 11 años, su familia se mudó a una granja en Wisconsin, en los Estados Unidos. Le encantaba explorar los bosques, los campos y los lagos." },
      { title: "Un paseo de mil millas", text: "En 1867, John caminó unas 1000 millas (1600 km) desde Kentucky hasta el golfo de México, estudiando plantas por todo el camino. Al año siguiente llegó a Yosemite, en California, y se enamoró de aquel lugar." },
      { title: "Palabras que protegen", text: "John escribió artículos y libros sobre la belleza de las montañas y de las secuoyas gigantes. Sus escritos ayudaron a convencer a la gente de que Yosemite fuera un parque nacional en 1890." },
      { title: "De campamento con un presidente", text: "En 1903, el presidente Theodore Roosevelt acampó con John en Yosemite. Después, Roosevelt protegió enormes zonas de bosques y tierras salvajes." }
    ],
    dialogue: {
      npc: { name: "John Muir", role: "un naturalista, escritor y explorador de la Sierra Nevada" },
      intro: "¡Hola! Soy John Muir. ¡Mira esos acantilados de granito y esas cascadas! Las montañas me llaman y tengo que ir. ¿Vienes tú también?",
      topics: [
        { ask: "¿Por qué te gustan tanto las montañas?", answer: "Aquí, cada árbol, cada flor, cada roca y cada cascada me enseñan algo. Soy más feliz cuando subo muy alto, con el viento en el pelo y un trozo de pan en el bolsillo." },
        { ask: "¿Qué es un parque nacional?", answer: "Es un lugar salvaje que pertenece a todo el mundo y que se protege para el futuro. Nadie puede talar todos sus árboles ni llenarlo de edificios. Yellowstone fue el primer parque nacional del mundo, en 1872." },
        { ask: "¿Qué son las secuoyas gigantes?", answer: "¡Los árboles más grandes de la Tierra! Algunas son más altas que un edificio de 25 pisos y tienen más de 2000 años. ¡Y aun así, sus piñas son solo del tamaño de un huevo de gallina!" },
        { ask: "¿Qué es el Sierra Club?", answer: "Un club que ayudé a fundar en 1892, y yo fui su primer presidente. Sus miembros exploran los lugares salvajes y trabajan para protegerlos." }
      ],
      challenge: {
        q: "¿Qué lugar ayudaron a convertir en parque nacional los escritos de John Muir en 1890?",
        choices: ["Yellowstone", "Yosemite", "Los Jardines de Kew"],
        explain: "Los artículos de Muir sobre la belleza de Yosemite ayudaron a convencer a la gente de protegerlo. Se convirtió en parque nacional en 1890."
      },
      farewell: "¡Sal a explorar! Sube a una colina, escucha un arroyo, y encontrarás lugares salvajes que vale la pena proteger."
    },
    timeline: {
      title: "John Muir y los parques nacionales",
      events: [
        { label: "John Muir nace en Dunbar, Escocia", when: "1838" },
        { label: "Camina unas 1000 millas hasta el golfo de México", when: "1867" },
        { label: "Llega a Yosemite por primera vez", when: "1868" },
        { label: "Yellowstone se convierte en el primer parque nacional del mundo", when: "1872" },
        { label: "Se crea el Parque Nacional de Yosemite", when: "1890" },
        { label: "El presidente Roosevelt acampa con Muir en Yosemite", when: "1903" }
      ]
    },
    artifact: {
      name: "Una piña de secuoya gigante",
      text: "Las secuoyas gigantes son los árboles más grandes de la Tierra, pero sus piñas son solo del tamaño de un huevo de gallina. Cada piña guarda unos doscientos piñones diminutos. Las semillas crecen mejor en suelo abierto y soleado."
    },
    quiz: [
      { q: "¿Dónde nació John Muir?", choices: ["En Japón", "En Escocia", "En Brasil"], hint: "Más tarde su familia se mudó a Wisconsin.", explain: "John Muir nació en Dunbar, Escocia, en 1838." },
      { q: "¿Qué es un parque nacional?", choices: ["Un lugar salvaje protegido para todos", "Un estacionamiento en una ciudad", "Un jardín privado"], hint: "Pertenece a todo el mundo.", explain: "Un parque nacional es un lugar salvaje protegido para todos, ahora y en el futuro." },
      { q: "¿Cómo ayudó John Muir a proteger Yosemite?", choices: ["Construyó un muro alrededor", "Lo compró entero", "Escribió artículos y libros sobre su belleza"], hint: "Era escritor.", explain: "Sus artículos y libros le mostraron a la gente lo especial que era Yosemite, y ayudaron a convertirlo en parque nacional." },
      { q: "¿Cuál fue el primer parque nacional del mundo, en 1872?", choices: ["Yosemite", "Los Jardines de Kew", "Gombe", "Yellowstone"], hint: "Es famoso por sus géiseres.", explain: "Yellowstone se convirtió en el primer parque nacional del mundo en 1872." },
      { q: "¿Qué presidente acampó con John Muir en 1903?", choices: ["Abraham Lincoln", "Theodore Roosevelt", "George Washington"], hint: "El osito de peluche, el «teddy bear», lleva su nombre.", explain: "El presidente Theodore Roosevelt acampó con Muir en Yosemite en 1903." }
    ]
  },
  'h5-forest-beatrix-potter': {
    title: "Beatrix Potter, artista de la naturaleza",
    topicName: "Beatrix Potter y la naturaleza",
    blurb: "Pinta hongos, escribe sobre Perico el conejo travieso y protege las colinas del Distrito de los Lagos.",
    reading: [
      { title: "Una niña que lo dibujaba todo", text: "Beatrix Potter nació en Londres en 1866. Tenía conejos y ratones como mascotas, y más tarde hasta un erizo, y los dibujaba y pintaba a todos." },
      { title: "Una científica de los hongos", text: "Beatrix pintó cientos de dibujos muy cuidadosos de hongos y otras setas. También hizo experimentos sobre cómo crecen sus esporas. En 1897, su trabajo sobre el tema se leyó en una famosa sociedad científica de Londres." },
      { title: "Perico el conejo travieso", text: "En 1902 se publicó su libro El cuento de Perico, el conejo travieso. A los niños les encantó, y ella escribió después más de 20 libritos." },
      { title: "Proteger la tierra", text: "Con el dinero de sus libros, Beatrix compró granjas en el Distrito de los Lagos, en Inglaterra. Al morir, dejó más de 4000 acres de tierra al National Trust, para que se cuidaran para siempre." }
    ],
    dialogue: {
      npc: { name: "Beatrix Potter", role: "artista, escritora, científica y granjera" },
      intro: "¡Buenos días! Soy Beatrix Potter. Tengo mis pinturas, mi cuaderno y una cesta de hongos para dibujar. ¡Siéntate y hazme compañía!",
      topics: [
        { ask: "¿Por qué pintas hongos?", answer: "¡Los hongos tienen tantísimas formas y colores! Los pinto con mucho cuidado para que cada detalle sea correcto. Los científicos pueden aprender mucho de un dibujo bien hecho." },
        { ask: "¿De dónde salió Perico el conejo?", answer: "Empezó como una carta con dibujos que le mandé a un niño pequeño llamado Noel, que estaba enfermo en cama. Le conté una historia sobre cuatro conejitos. Más tarde la convertí en un libro." },
        { ask: "¿Por qué te hiciste granjera?", answer: "¡Me encantan las colinas del Distrito de los Lagos! Compré granjas allí y crié ovejas Herdwick, una raza muy resistente de las montañas. Quería que la tierra y sus granjas siguieran tal como son." },
        { ask: "¿Quién cuida ahora tu tierra?", answer: "El National Trust. Mi amigo Hardwicke Rawnsley ayudó a fundarlo en 1895 para proteger lugares hermosos. Le dejé mis granjas y mis tierras, para que todo el mundo pueda disfrutarlas." }
      ],
      challenge: {
        q: "¿Qué le dejó Beatrix Potter al National Trust?",
        choices: ["Sus pinceles", "Más de 4000 acres de tierra y granjas", "Un castillo en Londres"],
        explain: "Dejó más de 4000 acres de tierra, con muchas granjas, para que el campo del Distrito de los Lagos estuviera protegido."
      },
      farewell: "Mira de cerca las cosas pequeñas de la naturaleza: un hongo, un ratón, una hoja. ¡En cada una hay una historia!"
    },
    timeline: {
      title: "La vida de Beatrix Potter",
      events: [
        { label: "Beatrix Potter nace en Londres", when: "1866" },
        { label: "Escribe una carta con dibujos sobre un conejo llamado Perico", when: "1893" },
        { label: "Se funda el National Trust para proteger lugares especiales", when: "1895" },
        { label: "Se lee en Londres su trabajo sobre cómo crecen las esporas de los hongos", when: "1897" },
        { label: "Se publica El cuento de Perico, el conejo travieso", when: "1902" },
        { label: "Compra la granja Hill Top en el Distrito de los Lagos", when: "1905" }
      ]
    },
    artifact: {
      name: "Una lupa",
      text: "Beatrix miraba los hongos con una lupa y con un microscopio. Dibujaba sus esporas diminutas y cómo brotaban, y pintaba cada hongo exactamente como era."
    },
    quiz: [
      { q: "¿Qué parte de la naturaleza estudió y pintó Beatrix Potter con mucho cuidado?", choices: ["Los hongos y otras setas", "Los volcanes", "Los tiburones"], hint: "Los llevaba a casa en una cesta.", explain: "Pintó cientos de dibujos cuidadosos de hongos y otras setas, y estudió sus esporas." },
      { q: "¿Qué libro famoso escribió?", choices: ["La isla del tesoro", "El cuento de Perico, el conejo travieso", "Alicia en el país de las maravillas"], hint: "Trata de un conejito muy travieso.", explain: "Beatrix Potter escribió El cuento de Perico, el conejo travieso, publicado en 1902." },
      { q: "¿Cómo empezó la historia de Perico el conejo?", choices: ["Como una película", "Como una canción", "Como una carta con dibujos para un niño enfermo"], hint: "Le escribió a un niño pequeño llamado Noel.", explain: "Empezó en 1893 como una carta con dibujos para Noel, un niño que estaba enfermo en cama." },
      { q: "¿En qué gastó el dinero de sus libros?", choices: ["En un auto de carreras", "En un barco", "En diamantes", "En granjas y tierras del Distrito de los Lagos"], hint: "Criaba ovejas Herdwick.", explain: "Compró granjas y tierras en el Distrito de los Lagos, y más tarde se las dejó al National Trust." },
      { q: "¿Por qué le dejó su tierra al National Trust?", choices: ["Para que estuviera protegida y cuidada para siempre", "Para que se pudiera construir en ella", "Para deshacerse de ella"], hint: "El National Trust protege lugares especiales.", explain: "Quería que la tierra y sus granjas estuvieran protegidas y cuidadas, para que todo el mundo las disfrutara." }
    ]
  },

  // ── Anillo 6: Anillos de Girasol ──
  'h6-forest-wangari-maathai': {
    title: "Wangari Maathai planta un Cinturón Verde",
    topicName: "Wangari Maathai y el Movimiento Cinturón Verde",
    blurb: "Planta millones de árboles en Kenia con la científica que ganó el Premio Nobel de la Paz.",
    reading: [
      { title: "Una científica de Kenia", text: "Wangari Maathai nació en Kenia en 1940. Estudió biología en los Estados Unidos y fue la primera mujer de África oriental y central en conseguir un doctorado, el título universitario más alto." },
      { title: "Los árboles traen agua y comida", text: "Wangari escuchó a las mujeres del campo. Le contaron que los arroyos se estaban secando y que costaba encontrar leña. Ella vio que una solución era plantar árboles." },
      { title: "El Movimiento Cinturón Verde", text: "En 1977 fundó el Movimiento Cinturón Verde. Grupos de mujeres cultivaban arbolitos con semillas de árboles de la zona y los plantaban. Entre todas han plantado más de 51 millones de árboles en Kenia." },
      { title: "Un Premio Nobel de la Paz", text: "En 2004, Wangari ganó el Premio Nobel de la Paz. Fue la primera mujer africana en ganarlo. Ella creía que cuidar la tierra ayuda a las personas a vivir juntas en paz." }
    ],
    dialogue: {
      npc: { name: "Wangari Maathai", role: "bióloga y fundadora del Movimiento Cinturón Verde" },
      intro: "¡Jambo! Soy Wangari Maathai. ¡Ven, ayúdame con estos arbolitos! Cada árbol pequeño que plantamos es un paso hacia una Kenia más verde.",
      topics: [
        { ask: "¿Por qué plantar árboles?", answer: "Los árboles sujetan la tierra cuando llueve. Ayudan a que los arroyos sigan corriendo, y dan leña, frutas y sombra. ¡Cuando plantamos árboles, plantamos esperanza!" },
        { ask: "¿Quién planta los árboles?", answer: "Sobre todo mujeres de pueblos de toda Kenia. Recogen semillas de los árboles de la zona, cultivan arbolitos en pequeños viveros y luego los plantan. Reciben un poquito de dinero por cada arbolito que crece." },
        { ask: "¿Qué es la historia del colibrí?", answer: "Un bosque se está quemando, y todos los animales grandes se quedan mirando. Pero un colibrí diminuto vuela hasta el arroyo y lleva al fuego una gota de agua cada vez. «Estoy haciendo lo mejor que puedo», dice. Sé como el colibrí: ¡haz tu parte!" },
        { ask: "¿Qué ganaste?", answer: "En 2004 gané el Premio Nobel de la Paz. Era la primera vez que se le daba a una mujer africana. Dije que una tierra sana ayuda a las personas a vivir en paz." }
      ],
      challenge: {
        q: "¿Qué hizo el Movimiento Cinturón Verde?",
        choices: ["Construyó carreteras", "Plantó millones de árboles", "Fabricó autos"],
        explain: "Las mujeres del Movimiento Cinturón Verde han plantado más de 51 millones de árboles por toda Kenia."
      },
      farewell: "¡Ve y siembra una semilla! Hasta un arbolito marca la diferencia. ¡Sé un colibrí!"
    },
    timeline: {
      title: "El camino verde de Wangari Maathai",
      events: [
        { label: "Wangari Maathai nace en Kenia", when: "1940" },
        { label: "Se va a estudiar a los Estados Unidos", when: "1960" },
        { label: "Consigue su doctorado en Nairobi", when: "1971" },
        { label: "Funda el Movimiento Cinturón Verde", when: "1977" },
        { label: "Gana el Premio Nobel de la Paz", when: "2004" }
      ]
    },
    artifact: {
      name: "Una medalla del Premio Nobel de la Paz",
      text: "El Premio Nobel de la Paz es una medalla de oro que se da por trabajar por la paz. Wangari Maathai la ganó en 2004 por su trabajo por el medio ambiente, por la justicia y por la paz. Ella decía que plantar árboles puede ayudar a las personas a vivir juntas en paz."
    },
    quiz: [
      { q: "¿De qué país era Wangari Maathai?", choices: ["Canadá", "Kenia", "India"], hint: "Te saludó diciendo «¡Jambo!».", explain: "Wangari Maathai nació en Kenia, en África oriental, en 1940." },
      { q: "¿Por qué quería Wangari que la gente plantara árboles?", choices: ["Los árboles sujetan la tierra, ayudan a los arroyos y dan leña", "Los árboles solo sirven para trepar", "Los árboles hacen que haga más calor"], hint: "Piensa en lo que le contaron las mujeres de los pueblos.", explain: "Los árboles sujetan la tierra, ayudan a que los arroyos sigan corriendo y dan leña, frutas y sombra." },
      { q: "¿Quién plantó la mayoría de los árboles del Movimiento Cinturón Verde?", choices: ["Robots", "Astronautas", "Mujeres de pueblos de toda Kenia"], hint: "Wangari las escuchó primero a ellas.", explain: "Las mujeres de los pueblos recogían semillas, cultivaban arbolitos y los plantaban." },
      { q: "¿Más o menos cuántos árboles ha plantado el Movimiento Cinturón Verde en Kenia?", choices: ["Unos 51", "Unos 510", "Unos 5100", "Más de 51 millones"], hint: "Es un número muy, muy grande.", explain: "Entre todos, los grupos han plantado más de 51 millones de árboles." },
      { q: "¿Qué hizo el colibrí de la historia de Wangari?", choices: ["Se fue volando muy lejos", "Llevó agua, gota a gota, para ayudar", "Se quedó mirando sin hacer nada"], hint: "«Estoy haciendo lo mejor que puedo».", explain: "El colibrí diminuto hizo su parte, gota a gota. Wangari decía que todos deberíamos ser como el colibrí." }
    ]
  },
  'h6-forest-jane-goodall': {
    title: "Jane Goodall en los bosques de Gombe",
    topicName: "Jane Goodall y los chimpancés",
    blurb: "Siéntate en silencio en el bosque y observa chimpancés salvajes con Jane Goodall.",
    reading: [
      { title: "Un sueño africano", text: "Jane Goodall nació en Londres en 1934. De niña le encantaban los animales y soñaba con vivir entre ellos en África. En 1960 fue a Gombe, en Tanzania, para estudiar chimpancés salvajes." },
      { title: "Paciencia en el bosque", text: "Al principio, los chimpancés huían de ella. Jane volvía día tras día y se sentaba en silencio, hasta que por fin la dejaron acercarse." },
      { title: "¡Los chimpancés fabrican herramientas!", text: "Jane vio a un chimpancé al que llamaba David Barbagrís quitarle las hojas a una ramita, meterla en un termitero y sacarla cubierta de termitas para comérselas. Los científicos creían que solo los humanos fabricaban herramientas. El descubrimiento de Jane lo cambió todo." },
      { title: "Esperanza para el futuro", text: "Jane pasó el resto de su larga vida viajando por el mundo para hablar en defensa de los chimpancés y de los bosques. En 1991 fundó Roots & Shoots («Raíces y Brotes»), un grupo en el que los jóvenes ayudan a los animales, a las personas y al planeta." }
    ],
    dialogue: {
      npc: { name: "Jane Goodall", role: "una científica que estudió chimpancés salvajes" },
      intro: "¡Hola! Soy Jane Goodall. Shh, quédate muy quieto: hay chimpancés en los árboles, justo encima de nosotros. Vamos a observarlos juntos.",
      topics: [
        { ask: "¿Cómo conseguiste que los chimpancés confiaran en ti?", answer: "¡Tuve paciencia! Llevaba siempre la misma ropa sencilla y volvía a los mismos lugares todos los días. Poco a poco, los chimpancés se acostumbraron a mí, y después de muchos meses me dejaron sentarme cerca." },
        { ask: "¿Qué descubriste?", answer: "Vi a un chimpancé quitarle las hojas a una ramita, meterla en un termitero y pescar termitas para comérselas. ¡Estaba fabricando una herramienta! En aquella época, la gente pensaba que solo los humanos hacían eso." },
        { ask: "¿Los chimpancés tienen sentimientos?", answer: "¡Yo creo que sí! Se abrazan, se dan la mano, se hacen cosquillas y juegan. Las mamás cuidan muchísimo a sus bebés. Cada chimpancé tiene su propio carácter, así que les puse nombres, como David Barbagrís y Flo." },
        { ask: "¿Qué pueden hacer los niños?", answer: "¡Muchas cosas! Formen un grupo de Roots & Shoots con sus amigos. Planten árboles, recojan basura, ayuden a los animales. Cada día puedes marcar la diferencia." }
      ],
      challenge: {
        q: "¿Qué vio Jane que un chimpancé usaba como herramienta?",
        choices: ["Una ramita para pescar termitas", "Una cuchara de metal", "Un pincel"],
        explain: "David Barbagrís le quitó las hojas a una ramita y la usó para pescar termitas en su termitero. Eso demostró que los chimpancés fabrican herramientas."
      },
      farewell: "Recuerda: cada uno de nosotros puede marcar la diferencia, todos los días."
    },
    timeline: {
      title: "La vida de Jane Goodall con los chimpancés",
      events: [
        { label: "Jane Goodall nace en Londres", when: "1934" },
        { label: "Llega a Gombe, en Tanzania, para estudiar a los chimpancés", when: "1960" },
        { label: "Consigue un doctorado en la Universidad de Cambridge", when: "1965" },
        { label: "Gombe se convierte en parque nacional", when: "1968" },
        { label: "Funda el Instituto Jane Goodall", when: "1977" },
        { label: "Funda Roots & Shoots con 12 estudiantes en Tanzania", when: "1991" }
      ]
    },
    artifact: {
      name: "Las notas de campo de Jane",
      text: "Cada día, Jane anotaba lo que hacía cada chimpancé: a quién acicalaba, qué comía y dónde dormía. Años de notas cuidadosas como estas ayudaron a los científicos a entender mucho mejor a los chimpancés."
    },
    quiz: [
      { q: "¿Qué animales estudió Jane Goodall en Gombe?", choices: ["Pingüinos", "Chimpancés", "Elefantes"], hint: "Son nuestros primos más cercanos del mundo animal.", explain: "Jane Goodall estudió chimpancés salvajes en Gombe, en Tanzania." },
      { q: "¿Cómo consiguió Jane que los chimpancés se acostumbraran a ella?", choices: ["Teniendo paciencia y volviendo todos los días", "Dándoles juguetes", "Gritando"], hint: "Le llevó muchos meses.", explain: "Tuvo paciencia: volvía a los mismos lugares todos los días hasta que los chimpancés la dejaron acercarse." },
      { q: "¿Por qué fue tan sorprendente su descubrimiento de las herramientas?", choices: ["Se creía que los chimpancés les tenían miedo a las termitas", "Nadie sabía que existían las termitas", "La gente pensaba que solo los humanos fabricaban herramientas"], hint: "¿Qué creían antes los científicos?", explain: "Los científicos creían que solo los humanos fabricaban herramientas, así que ver a un chimpancé hacer una cambió la forma en que la gente veía a los animales." },
      { q: "¿En qué país está Gombe?", choices: ["Kenia", "Brasil", "India", "Tanzania"], hint: "Allí también empezó Roots & Shoots.", explain: "Gombe está en Tanzania, en África oriental." },
      { q: "¿Qué es Roots & Shoots?", choices: ["Un tipo de árbol", "Un grupo en el que los jóvenes ayudan a los animales, a las personas y al planeta", "El nombre de un chimpancé"], hint: "Jane lo fundó en 1991.", explain: "Roots & Shoots es un grupo en el que los jóvenes hacen proyectos para ayudar a los animales, a las personas y al planeta." }
    ]
  },

  // ── Anillo 7: Corona Estelar ──
  'h7-forest-mendel-peas': {
    title: "Las plantas de guisantes de Gregor Mendel",
    topicName: "Mendel y la herencia",
    blurb: "Cuenta miles de guisantes en el huerto de un monasterio y descubre las reglas de la herencia.",
    reading: [
      { title: "Un huerto en un monasterio", text: "Gregor Mendel era un monje de la abadía de Santo Tomás de Brno, en lo que hoy es la República Checa. Entre 1856 y 1863 cultivó decenas de miles de plantas de guisantes en el huerto del monasterio." },
      { title: "Siete rasgos claros", text: "Mendel eligió siete rasgos que tenían dos formas claras cada uno, como semillas amarillas o verdes, semillas lisas o rugosas, y plantas altas o bajas. Cruzaba las plantas llevando el polen de una flor a otra con un pincelito." },
      { title: "El patrón de 3 a 1", text: "Cruzó plantas puras de semillas amarillas con plantas puras de semillas verdes, ¡y todas las hijas tuvieron semillas amarillas! Pero en la generación siguiente volvió el verde: unas 3 amarillas por cada 1 verde. Contó 6022 semillas amarillas y 2001 verdes." },
      { title: "Dominante y recesivo", text: "Mendel descubrió que cada planta lleva dos «factores» para cada rasgo, uno de cada progenitor. Un factor dominante, como el amarillo, esconde a uno recesivo, como el verde. Hoy a esos factores los llamamos genes." }
    ],
    dialogue: {
      npc: { name: "Gregor Mendel", role: "un monje y científico que estudió las plantas de guisantes" },
      intro: "¡Bienvenido al huerto del monasterio! Soy Gregor Mendel. Cuidado con las plantas de guisantes: cada una es parte de mi experimento. ¿Te enseño lo que he estado contando?",
      topics: [
        { ask: "¿Por qué elegiste los guisantes?", answer: "¡Los guisantes son perfectos! Crecen rápido, tienen rasgos claros, como semillas amarillas o verdes, y puedo controlar qué polen llega a cada planta. Puedo estudiar muchas generaciones en solo unos pocos años." },
        { ask: "¿Qué pasó cuando cruzaste amarillas y verdes?", answer: "Todas las plantas de la primera generación tuvieron semillas amarillas. ¡El verde parecía haber desaparecido! Pero cuando esas plantas hicieron sus propias semillas, el verde volvió a salir en más o menos una cuarta parte de ellas." },
        { ask: "¿Qué quiere decir dominante?", answer: "Cada planta tiene dos factores para el color de la semilla. Si tiene aunque sea un factor amarillo, sus semillas son amarillas, así que el amarillo es dominante. Una planta solo tiene semillas verdes si sus dos factores son verdes, así que el verde es recesivo." },
        { ask: "¿La gente te hizo caso?", answer: "Presenté mi trabajo en 1865 y lo publiqué en 1866, pero mientras viví poca gente lo entendió. Luego, en 1900, otros tres científicos volvieron a encontrar mi trabajo, ¡y ahora me llaman el padre de la genética!" }
      ],
      challenge: {
        q: "En la segunda generación, ¿más o menos qué fracción de las semillas de guisante de Mendel era verde?",
        choices: ["Ninguna", "Más o menos 1/4", "Más o menos 3/4", "Todas"],
        explain: "Unas 3 amarillas por cada 1 verde quiere decir que 1 de cada 4 semillas, más o menos 1/4, era verde. Contó 6022 amarillas y 2001 verdes."
      },
      farewell: "Sigue contando con cuidado, y la naturaleza te mostrará sus patrones. ¡Adiós, joven científico!"
    },
    timeline: {
      title: "Mendel y la ciencia de la herencia",
      events: [
        { label: "Gregor Mendel nace en Silesia, en la actual República Checa", when: "1822" },
        { label: "Entra en la abadía de Santo Tomás de Brno", when: "1843" },
        { label: "Empieza sus experimentos con plantas de guisantes", when: "1856" },
        { label: "Presenta sus resultados en Brno", when: "1865" },
        { label: "Tres científicos vuelven a descubrir el trabajo de Mendel", when: "1900" },
        { label: "Unos científicos descubren la forma de doble hélice del ADN, del que están hechos los genes", when: "1953" }
      ]
    },
    artifact: {
      name: "Una lupa",
      text: "Trabajar con las partes diminutas de las flores necesita buena vista, y una lupa ayuda. Para cruzar dos plantas de guisantes, Mendel abría una flor joven, le quitaba las partes que hacen el polen y le echaba con un pincelito polen de otra planta."
    },
    quiz: [
      { q: "¿Dónde cultivaba Mendel sus plantas de guisantes?", choices: ["En un barco", "En un desierto", "En un parque de París", "En el huerto de un monasterio"], hint: "Era monje.", explain: "Mendel cultivaba sus guisantes en el huerto de la abadía de Santo Tomás de Brno." },
      { q: "Mendel cruzó plantas puras de semillas amarillas con plantas puras de semillas verdes. ¿De qué color eran las semillas de todas las plantas de la primera generación?", choices: ["Verdes", "Amarillas", "Mitad amarillas, mitad verdes"], hint: "Un color era dominante.", explain: "Todas las semillas de la primera generación eran amarillas, porque el amarillo es dominante." },
      { q: "En la generación siguiente, Mendel contó 6022 semillas amarillas y 2001 verdes. ¿A qué proporción se parece más?", choices: ["1 : 1", "2 : 1", "3 : 1", "4 : 3"], hint: "Divide 6022 entre 2001.", explain: "6022 ÷ 2001 es más o menos 3,01, así que la proporción está muy cerca de 3 : 1." },
      { q: "Una planta de guisantes tiene un factor amarillo y un factor verde. ¿De qué color son sus semillas?", choices: ["Amarillas, porque el amarillo es dominante", "Verdes, porque el verde es dominante", "Mitad amarillas y mitad verdes"], hint: "Un factor dominante esconde a uno recesivo.", explain: "El amarillo es dominante, así que basta con un factor amarillo para que las semillas sean amarillas." },
      { q: "¿Cómo llamamos hoy a los «factores» de Mendel?", choices: ["Átomos", "Genes", "Células"], hint: "La ciencia de la herencia lleva su nombre.", explain: "Los factores de Mendel son lo que hoy llamamos genes, y la ciencia que los estudia se llama genética." }
    ]
  },
  'h7-forest-amazon-scientists': {
    title: "Científicos de la selva amazónica",
    topicName: "La selva amazónica",
    blurb: "Explora la selva tropical más grande del mundo con los científicos y artistas que la estudiaron, y con la gente que la protege.",
    reading: [
      { title: "La selva más grande", text: "La selva amazónica, en América del Sur, es la selva tropical más grande de la Tierra, más grande que toda la India. Allí vive más o menos 1 de cada 10 de todos los tipos de plantas y animales que conocemos." },
      { title: "Un naturalista en el río", text: "En 1848, Henry Walter Bates viajó en barco al Amazonas. Pasó allí 11 años y reunió unos 14 700 tipos de animales, sobre todo insectos. ¡Unos 8000 eran nuevos para la ciencia!" },
      { title: "Pintar una flor de la luna", text: "La artista Margaret Mee pintó plantas del Amazonas durante más de 30 años. En 1988, cuando tenía casi 80 años, pintó una rara flor de cactus llamada flor de la luna, que se abre una sola noche." },
      { title: "Proteger la selva", text: "Los pueblos indígenas han cuidado el Amazonas durante miles de años. Hoy, los parques y las tierras indígenas protegen zonas enormes de la selva. Entre 2004 y 2012, Brasil redujo en más de tres cuartas partes la selva que se perdía cada año en el Amazonas." }
    ],
    dialogue: {
      npc: { name: "Doctora Luana", role: "una científica brasileña de la selva tropical" },
      intro: "¡Olá! Soy la doctora Luana. Bienvenido a nuestra estación de investigación, en lo más profundo del Amazonas. Sube conmigo a la pasarela del dosel: ¡allí arriba está casi toda la vida!",
      topics: [
        { ask: "¿Por qué hay tanta vida en el dosel?", answer: "El dosel es el techo de hojas que hay muy por encima del suelo. Es donde llega más luz del sol, así que tiene más flores, frutas y hojas para comer. ¡Muchos animales pasan aquí arriba toda su vida y casi nunca tocan el suelo!" },
        { ask: "¿Quiénes fueron los primeros científicos de la selva?", answer: "¡Los pueblos indígenas del Amazonas! Conocen sus plantas y sus animales desde hace miles de años. Más tarde vinieron a estudiarla visitantes como Alexander von Humboldt, Henry Walter Bates y Alfred Russel Wallace, y aprendieron mucho de los guías de la zona." },
        { ask: "¿Todavía quedan especies nuevas por encontrar?", answer: "¡Sí! Cada año, los científicos describen tipos nuevos de plantas y animales del Amazonas: ranas, peces, insectos ¡y hasta monos!" },
        { ask: "¿Se está protegiendo la selva?", answer: "Sí, y hay motivos para tener esperanza. Parques enormes y tierras indígenas protegen grandes partes de la selva. Cuando la gente trabaja junta, la pérdida de selva puede bajar muchísimo, como pasó en Brasil entre 2004 y 2012." }
      ],
      challenge: {
        q: "¿Más o menos cuántos de todos los tipos de plantas y animales que conocemos viven en el Amazonas?",
        choices: ["Más o menos 1 de cada 10", "Más o menos 1 de cada 1000", "Todos"],
        explain: "En el Amazonas vive más o menos 1 de cada 10 de todos los tipos de plantas y animales conocidos de la Tierra."
      },
      farewell: "¡Gracias por visitar el dosel! Recuerda: los bosques están llenos de descubrimientos que todavía esperan a que alguien los haga."
    },
    timeline: {
      title: "El estudio del Amazonas a lo largo del tiempo",
      events: [
        { label: "Alexander von Humboldt demuestra que el río Casiquiare une el Orinoco y el Amazonas", when: "1800" },
        { label: "Henry Walter Bates y Alfred Russel Wallace llegan al Amazonas", when: "1848" },
        { label: "Bates publica su libro El naturalista en el río Amazonas", when: "1863" },
        { label: "Margaret Mee pinta la flor de la luna abierta", when: "1988" },
        { label: "Brasil empieza un gran programa de áreas protegidas en el Amazonas", when: "2002" },
        { label: "La pérdida de selva en el Amazonas brasileño baja a su nivel más bajo desde que hay registros", when: "2012" }
      ]
    },
    artifact: {
      name: "Una brújula",
      text: "Bajo el espeso techo de la selva tropical cuesta ver el Sol o las estrellas. Los científicos usan una brújula y mapas, y hoy también GPS, para llegar a sus zonas de estudio y volver."
    },
    quiz: [
      { q: "¿Dónde está la selva amazónica?", choices: ["En Europa", "En América del Sur", "En la Antártida"], hint: "Allí está Brasil.", explain: "La selva amazónica está en América del Sur, sobre todo en Brasil." },
      { q: "¿Qué es el dosel de la selva?", choices: ["El techo de hojas que hay muy por encima del suelo", "Un río subterráneo", "Un tipo de barca"], hint: "La doctora Luana te llevó por una pasarela para verlo.", explain: "El dosel es el techo de hojas que hay muy por encima del suelo de la selva, donde está casi toda la vida." },
      { q: "Henry Walter Bates reunió unos 14 700 tipos de animales en el Amazonas. ¿Más o menos cuántos eran nuevos para la ciencia?", choices: ["Unos 80", "Unos 800", "Unos 8000"], hint: "Eran más de la mitad.", explain: "Unos 8000 de los tipos que reunió no los había descrito antes ningún científico." },
      { q: "¿Quién ha cuidado la selva amazónica durante miles de años?", choices: ["Los vikingos", "Los antiguos romanos", "Los astronautas", "Los pueblos indígenas"], hint: "Fueron los primeros científicos de la selva.", explain: "Los pueblos indígenas han vivido en el Amazonas y lo han cuidado durante miles de años." },
      { q: "¿Qué pintó Margaret Mee en 1988?", choices: ["Un mapa de las estrellas", "Una flor de la luna que se abre una sola noche", "El retrato de un rey"], hint: "Florece en la oscuridad.", explain: "Pintó la rara flor de la luna, una flor de cactus que se abre una sola noche." }
    ]
  },

  // ───────── Laboratorio de la Naturaleza ─────────
  // ── Anillo 1: Hueco de las Raíces ──
  'p1-forest-falling-seeds': {
    title: "Semillas y bellotas que caen",
    topicName: "La gravedad y las caídas",
    blurb: "Suelta una semilla peludita y una bellota pesada. ¿Cuál llega primero al suelo?",
    reading: [
      { title: "Todo se cae", text: "Cuando una bellota se suelta de su roble, cae al suelo. Una fuerza llamada gravedad tira de todo hacia abajo, hacia la Tierra." },
      { title: "Las semillas peluditas flotan", text: "La semilla del diente de león tiene un paracaídas peludito. El aire empuja hacia arriba por debajo de la pelusa, así que la semilla baja despacio, flotando. El viento puede llevarla muy lejos." },
      { title: "Las bellotas caen de golpe", text: "Una bellota es pequeña y pesada para su tamaño, así que el aire casi no la frena. Cae derechita al suelo. ¡Plof!" },
      { title: "A lugares nuevos", text: "Las plantas quieren que sus semillas caigan en lugares nuevos donde haya sitio para crecer. Algunas semillas vuelan con el viento, ¡y las ardillas y los arrendajos se llevan las bellotas y las entierran!" }
    ],
    sim: {
      predict: {
        q: "En el laboratorio, una pluma (peludita, como una semilla de diente de león) y una pelota (pesada, como una bellota) se sueltan a la vez. ¿Cuál llega primero al suelo?",
        choices: ["La pluma", "La pelota", "Llegan juntas"],
        explain: "El aire empuja mucho la pluma peludita y la frena. La pelota casi no nota el aire, así que llega primero."
      }
    },
    quiz: [
      { q: "¿Qué tira de una bellota hacia el suelo?", choices: ["La gravedad", "El viento", "Un imán"], hint: "Tira de todo hacia abajo, hacia la Tierra.", explain: "La gravedad tira de la bellota, y de todo lo demás, hacia abajo, hacia la Tierra." },
      { q: "¿Por qué la semilla del diente de león cae despacio?", choices: ["Está hecha de piedra", "El aire empuja hacia arriba por debajo de su paracaídas peludito", "Está dormida"], hint: "Mira su pelusa.", explain: "El aire empuja hacia arriba por debajo del paracaídas peludito, así que la semilla baja despacio, flotando." },
      { q: "Se sueltan una pluma y una pelota a la vez. ¿Cuál llega la última?", choices: ["La pelota", "Llegan juntas", "La pluma"], hint: "Acuérdate de lo que viste en el laboratorio.", explain: "El aire frena la pluma peludita, así que llega después de la pelota." },
      { q: "¿Cómo puede viajar muy lejos una semilla de diente de león?", choices: ["Camina", "La lleva el viento", "Nada"], hint: "¡Sopla un diente de león y verás!", explain: "El viento atrapa el paracaídas peludito y lleva la semilla muy lejos." },
      { q: "¿Qué animal se lleva las bellotas y las entierra?", choices: ["Una ardilla", "Un pez", "Un caracol"], hint: "Tiene una cola grande y peluda.", explain: "Las ardillas entierran bellotas para comérselas después. ¡Algunas se les olvidan y se convierten en robles nuevos!" }
    ]
  },
  'p1-forest-twig-boats': {
    title: "Barquitos de ramitas en el charco",
    topicName: "Flotar y hundirse",
    blurb: "Echa cosas del bosque al tanque de agua. ¿Cuáles flotan como un barquito de ramitas?",
    reading: [
      { title: "Flotar o hundirse", text: "Cuando echas algo al agua, se queda arriba o baja hasta el fondo. Quedarse arriba se llama flotar. Bajar hasta el fondo se llama hundirse." },
      { title: "La madera flota", text: "Las ramitas, los palos y los troncos flotan en los estanques y en los arroyos. ¡Por eso una ramita es un buen barquito!" },
      { title: "El corcho sale de un árbol", text: "El corcho es la corteza blanda y ligera del alcornoque. Está lleno de huequitos de aire, así que flota muy bien." },
      { title: "No depende del tamaño", text: "Una piedrita es mucho más pequeña que un tronco, pero la piedrita se hunde y el tronco flota. Importa más de qué está hecha una cosa que lo grande que es." }
    ],
    sim: {
      predict: {
        q: "Una manzana cae de un árbol al agua. ¿Flotará o se hundirá?",
        choices: ["Se hunde", "Flota"],
        explain: "¡La manzana flota! Tiene mucho aire por dentro, y eso la hace ligera para su tamaño."
      }
    },
    quiz: [
      { q: "¿Cuál de estas cosas flota en un estanque?", choices: ["Una ramita", "Una piedra", "Una llave"], hint: "Viene de un árbol.", explain: "Una ramita es de madera, y la madera flota. Las piedras y las llaves se hunden." },
      { q: "¿De dónde sale el corcho?", choices: ["De una roca", "De la corteza del alcornoque", "Del mar"], hint: "Crece en un árbol.", explain: "El corcho es la corteza ligera del alcornoque." },
      { q: "¿Por qué flota una manzana?", choices: ["Es roja", "Es redonda", "Tiene mucho aire por dentro"], hint: "¿Qué se esconde dentro de la manzana?", explain: "Una manzana tiene mucho aire por dentro, así que es ligera para su tamaño y flota." },
      { q: "Una piedrita y un tronco grande caen a un arroyo. ¿Cuál se hunde?", choices: ["La piedrita", "El tronco"], hint: "No lo decide el tamaño.", explain: "La piedrita se hunde y el tronco grande flota. Importa más de qué está hecha una cosa que su tamaño." },
      { q: "¿Por qué las ramitas son buenos barquitos?", choices: ["La madera es pegajosa", "La madera flota", "La madera se hunde rápido"], hint: "Un barco tiene que quedarse encima del agua.", explain: "La madera flota, así que una ramita se queda encima del agua como un barquito." }
    ]
  },

  // ── Anillo 2: Ramas de Helecho ──
  'p2-forest-woodpecker-drums': {
    title: "El tamborileo del pájaro carpintero",
    topicName: "El sonido",
    blurb: "¡Toc-toc-toc! Descubre cómo hacen sus sonidos los pájaros carpinteros, los pajaritos y los búhos.",
    reading: [
      { title: "Los sonidos son sacudidas", text: "Cada sonido lo hace algo que se sacude de un lado a otro muy rápido. Esa sacudida se llama vibración." },
      { title: "Toc-toc-toc", text: "El pájaro carpintero tamborilea en un árbol con el pico, muchas veces cada segundo. La madera vibra y el sonido viaja lejos por el bosque. ¡Así dice el pájaro carpintero: esta es mi casa!" },
      { title: "Agudo y grave", text: "Las cosas pequeñas y cortas vibran rápido y hacen sonidos agudos, como el pío de un pajarito. Las cosas grandes y largas vibran despacio y hacen sonidos graves, como el ulular de un búho." },
      { title: "Fuerte y suave", text: "Si golpeas algo con fuerza, vibra mucho y el sonido es fuerte. Si le das un toquecito, el sonido es suave." }
    ],
    sim: {
      predict: {
        q: "En el laboratorio, haces que sobresalga menos parte de la regla, así que la parte que vibra es más corta. Luego la haces vibrar. ¿Cómo sonará la nota?",
        choices: ["Más grave", "Igual", "Más aguda"],
        explain: "Una regla más corta vibra más rápido, y una vibración más rápida hace una nota más aguda, como el pío de un pajarito."
      }
    },
    quiz: [
      { q: "¿Qué hace un sonido?", choices: ["Algo que se sacude de un lado a otro", "Algo que se queda muy quieto", "La luz"], hint: "Tócate la garganta cuando tarareas.", explain: "Cada sonido lo hace algo que se sacude de un lado a otro: una vibración." },
      { q: "¿Por qué el pájaro carpintero tamborilea en los árboles?", choices: ["Para despertar a los árboles", "Para decirles a otros pájaros carpinteros que esa es su casa", "Para que llueva"], hint: "El sonido llega lejos por el bosque.", explain: "Los pájaros carpinteros tamborilean para decir «esta es mi casa» y para llamar a otros pájaros carpinteros." },
      { q: "Haces vibrar una regla corta y una regla larga. ¿Cuál hace la nota más aguda?", choices: ["La larga", "Son iguales", "La corta"], hint: "Las cosas cortas vibran más rápido.", explain: "La regla corta vibra más rápido, así que hace una nota más aguda." },
      { q: "¿Cómo haces que suene más fuerte un tambor hecho con un tronco?", choices: ["Golpeándolo con más fuerza", "Golpeándolo más suave", "Susurrándole"], hint: "Una sacudida grande hace un sonido grande.", explain: "Si lo golpeas con más fuerza, la madera vibra más, así que el sonido es más fuerte." },
      { q: "¿Cuál hace un sonido más grave?", choices: ["El pío de un pajarito", "El ulular de un búho grande"], hint: "Las cosas grandes vibran despacio.", explain: "El ulular de un búho grande es un sonido grave. El pío de un pajarito es agudo." }
    ]
  },
  'p2-forest-rolling-acorns': {
    title: "Bellotas rodando",
    topicName: "El rozamiento",
    blurb: "Rueda colina abajo sobre musgo blando, un tronco liso o un estanque helado. ¿Dónde llega más lejos?",
    reading: [
      { title: "Rodar cuesta abajo", text: "Pon una bellota arriba de una cuesta y suéltala. La gravedad tira de ella hacia abajo y rueda cada vez más rápido." },
      { title: "El rozamiento frena las cosas", text: "Cuando algo roza o rueda sobre una superficie, una fuerza llamada rozamiento lo frena. Las superficies blandas y con bultos hacen mucho rozamiento." },
      { title: "Musgo, madera y hielo", text: "El musgo blando es como una alfombra: para las cosas enseguida. La madera lisa está en medio. Un estanque helado es muy resbaladizo, así que las cosas se deslizan y ruedan muy lejos." },
      { title: "El rozamiento también ayuda", text: "¡El rozamiento es útil! Ayuda a que tus zapatos se agarren al camino del bosque, y a que las patas de un erizo se agarren a un tronco." }
    ],
    sim: {
      predict: {
        q: "El cochecito de juguete baja por la rampa y llega a una alfombra (blanda, como el musgo), a la madera o al hielo. ¿Sobre cuál llegará más lejos?",
        choices: ["La alfombra", "El hielo", "La madera"],
        explain: "El hielo es liso y resbaladizo, así que hace el menor rozamiento. El coche llega más lejos sobre el hielo y se para antes sobre la alfombra blanda."
      }
    },
    quiz: [
      { q: "¿Cuál es la fuerza que frena las cosas que ruedan?", choices: ["El rozamiento", "El magnetismo", "El sonido"], hint: "Aparece cuando las cosas se rozan.", explain: "El rozamiento es la fuerza que frena las cosas cuando rozan o ruedan sobre una superficie." },
      { q: "¿Dónde llegará más lejos una bellota rodando?", choices: ["Sobre el musgo blando", "Sobre un estanque helado", "En el barro espeso"], hint: "¿Cuál es el más resbaladizo?", explain: "Un estanque helado es liso y resbaladizo, con muy poco rozamiento, así que la bellota llega más lejos." },
      { q: "¿Por qué el musgo blando para enseguida una bellota que rueda?", choices: ["El musgo está frío", "El musgo es verde", "Hace mucho rozamiento"], hint: "El musgo es blando y con bultos, como una alfombra.", explain: "El musgo blando y con bultos hace mucho rozamiento, así que la bellota se para enseguida." },
      { q: "¿Por qué es fácil resbalar en el hielo?", choices: ["El hielo es pegajoso", "El hielo hace muy poco rozamiento", "El hielo está caliente"], hint: "Tus zapatos no se pueden agarrar.", explain: "El hielo es liso y hace muy poco rozamiento, así que tus pies se deslizan." },
      { q: "¿Cómo te ayuda el rozamiento en un camino del bosque?", choices: ["Ayuda a que tus zapatos se agarren y no resbales", "Hace que vueles", "Moja el camino"], hint: "Piensa en caminar sin resbalar.", explain: "El rozamiento entre tus zapatos y el camino te deja agarrarte y caminar sin resbalar." }
    ]
  },

  // ── Anillo 3: Ramas de Farolillos ──
  'p3-forest-firefly-lantern': {
    title: "El farolillo de luciérnaga",
    topicName: "Circuitos eléctricos",
    blurb: "Enciende un farolillo para las ardillas: ¿qué cosas dejan pasar la electricidad?",
    reading: [
      { title: "Las luciérnagas hacen su propia luz", text: "En las noches de verano, las luciérnagas brillan en la oscuridad. Hacen luz dentro de su cuerpo mezclando unas sustancias químicas especiales. ¡No usan nada de electricidad!" },
      { title: "Un farolillo necesita una vuelta completa", text: "Un farolillo eléctrico necesita una pila, una bombilla y cables unidos en una vuelta completa. Esa vuelta se llama circuito. Si hay un hueco, la bombilla se queda apagada." },
      { title: "Conductores", text: "La electricidad puede pasar por metales como el cobre, el hierro y el aluminio. Las cosas que dejan pasar la electricidad se llaman conductores." },
      { title: "Aislantes", text: "La electricidad no puede pasar por la madera seca, el plástico, la goma ni el papel. Se llaman aislantes. El plástico que cubre los cables nos ayuda a estar seguros." }
    ],
    sim: {
      predict: {
        q: "Cierras el hueco con un palito de madera, como una ramita del árbol. ¿Se encenderá la bombilla del farolillo?",
        choices: ["Sí, se enciende", "No, se queda apagada"],
        explain: "La madera es un aislante: la electricidad no puede pasar por ella. La vuelta sigue rota, así que la bombilla se queda apagada. Un cable de cobre o un clip sí la encenderían."
      }
    },
    quiz: [
      { q: "¿Cómo hacen su luz las luciérnagas?", choices: ["Mezclando sustancias químicas especiales en su cuerpo", "Con pilas diminutas", "Atrapando luz del sol en frascos"], hint: "No usan electricidad.", explain: "Las luciérnagas hacen luz mezclando unas sustancias químicas especiales dentro de su cuerpo." },
      { q: "¿Qué es un circuito?", choices: ["Un tipo de insecto", "Una vuelta completa por la que puede pasar la electricidad", "La rama de un árbol"], hint: "La bombilla solo se enciende cuando no hay ningún hueco.", explain: "Un circuito es una vuelta completa, de la pila a la bombilla y otra vez a la pila, por la que puede pasar la electricidad." },
      { q: "¿Cuál de estos es un conductor?", choices: ["Una ramita", "Una goma elástica", "Un clip"], hint: "Busca el que es de metal.", explain: "Un clip es de metal, así que la electricidad puede pasar por él." },
      { q: "¿Cómo apaga un interruptor un farolillo?", choices: ["Abre un hueco en la vuelta", "Enfría la bombilla", "Esconde la pila"], hint: "La electricidad necesita una vuelta completa.", explain: "Al apagar el interruptor se abre un hueco, así que la vuelta se rompe y la bombilla se apaga." },
      { q: "¿Por qué los cables están cubiertos de plástico?", choices: ["El plástico hace que la electricidad vaya más rápido", "El plástico es aislante, así que nos protege", "El plástico hace brillar el cable"], hint: "La electricidad no puede pasar por el plástico.", explain: "El plástico es aislante, así que la electricidad se queda dentro del cable y no puede llegar a nuestras manos." }
    ]
  },
  'p3-forest-hike-compass': {
    title: "Una brújula para la excursión por el bosque",
    topicName: "Imanes",
    blurb: "Encuentra el camino por el bosque con un imán que apunta al norte.",
    reading: [
      { title: "¿Y ahora por dónde?", text: "En lo más profundo de un bosque, todos los caminos pueden parecer iguales. Una brújula ayuda a los excursionistas a saber dónde está el norte." },
      { title: "Un imán por dentro", text: "La aguja de una brújula es un imán fino que puede girar libremente. La Tierra funciona como un imán gigante, así que la aguja gira hasta quedar alineada de norte a sur." },
      { title: "Lo que atraen los imanes", text: "Los imanes atraen las cosas hechas de hierro y de acero, como los clavos y los clips. No atraen la madera, el vidrio, el plástico ni la goma." },
      { title: "Dos polos", text: "Todo imán tiene un polo norte y un polo sur. Dos polos norte se empujan y se separan. Un polo norte y un polo sur se atraen." }
    ],
    sim: {
      predict: {
        q: "¿Cuál recogerá el imán: el clip o la canica de vidrio?",
        choices: ["La canica de vidrio", "El clip", "Los dos"],
        explain: "El clip es de acero, que es casi todo hierro, así que el imán lo atrae. El vidrio no es magnético."
      }
    },
    quiz: [
      { q: "¿Qué es la aguja de una brújula?", choices: ["Un imán fino que puede girar", "Un trozo de madera", "Una hoja de pino"], hint: "Gira para apuntar al norte.", explain: "La aguja de una brújula es un imán fino que puede girar libremente." },
      { q: "¿Hacia dónde apunta la aguja de una brújula?", choices: ["Hacia el árbol más alto", "Al norte y al sur", "Hacia el río más cercano"], hint: "Piensa en las direcciones de un mapa.", explain: "La aguja se alinea de norte a sur, porque la Tierra funciona como un imán gigante." },
      { q: "¿Cuál de estas cosas atraerá un imán?", choices: ["Una piña", "Una canica de vidrio", "Un clavo de hierro"], hint: "Los imanes atraen el hierro y el acero.", explain: "El clavo de hierro se pega. Las piñas y el vidrio no son magnéticos." },
      { q: "Dos imanes tienen sus polos norte uno frente al otro. ¿Qué pasa?", choices: ["Se empujan y se separan", "Se atraen y se juntan", "No pasa nada"], hint: "Dos polos iguales…", explain: "Dos polos norte se empujan y se separan. Solo los polos opuestos se atraen." },
      { q: "¿Por qué tienes que mantener la brújula lejos de una olla de hierro?", choices: ["La olla se calentará", "El hierro atrae la aguja y hace que apunte a donde no es", "La brújula se derretirá"], hint: "¿Qué atrae un imán?", explain: "El hierro cerca de una brújula atrae su aguja magnética, así que apunta a donde no es." }
    ]
  },

  // ── Anillo 4: Copa en Flor ──
  'p4-forest-tree-shadows': {
    title: "Las sombras de los árboles a lo largo del día",
    topicName: "La luz y las sombras",
    blurb: "Mira cómo las sombras de los árboles se alargan y se encogen, y mide un árbol con su sombra.",
    reading: [
      { title: "La luz va en línea recta", text: "La luz viaja en línea recta. Cuando un árbol tapa la luz del sol, deja detrás de él una forma oscura: su sombra." },
      { title: "Sombras largas y cortas", text: "Por la mañana y por la tarde, el Sol está bajo en el cielo, así que las sombras son largas. Hacia el mediodía, el Sol está alto, así que las sombras son cortas." },
      { title: "Las sombras se mueven", text: "Mientras el Sol cruza el cielo, las sombras giran alrededor del árbol. Por la mañana el Sol está en el este, así que las sombras apuntan al oeste. Por la tarde apuntan al este. Los relojes de sol usan sombras para dar la hora." },
      { title: "Mide un árbol", text: "En un mismo momento, todas las sombras sobre suelo plano guardan la misma proporción con lo que las hace. Si un palo de 1 m tiene una sombra de 2 m, ¡un árbol con una sombra de 20 m mide 10 m!" }
    ],
    sim: {
      predict: {
        q: "En el laboratorio, acercas la linterna al juguete. ¿Qué le pasa a la sombra del juguete en la pared?",
        choices: ["Se hace más grande", "Se hace más pequeña", "Desaparece"],
        explain: "Cerca de la linterna, el juguete tapa mucha más luz, así que su sombra crece."
      }
    },
    quiz: [
      { q: "¿Cuándo son más cortas las sombras de los árboles?", choices: ["Muy temprano por la mañana", "Hacia el mediodía, cuando el Sol está alto", "Por la tarde"], hint: "¿Cuándo está el Sol más alto en el cielo?", explain: "Hacia el mediodía el Sol está alto, así que las sombras son cortas." },
      { q: "¿Por qué un árbol hace sombra?", choices: ["Tapa la luz del sol", "Hace pintura oscura", "Sus hojas son verdes"], hint: "La luz no puede atravesarlo.", explain: "El árbol tapa la luz del sol, y la luz viaja en línea recta, así que detrás de él se forma una sombra oscura." },
      { q: "Por la mañana el Sol está en el este. ¿Hacia dónde apunta la sombra de un árbol?", choices: ["Al este", "Hacia arriba, al cielo", "Al oeste"], hint: "Una sombra apunta al lado contrario del Sol.", explain: "La sombra apunta al lado contrario del Sol, así que por la mañana apunta al oeste." },
      { q: "Un palo de 1 m tiene una sombra de 2 m. En ese mismo momento, la sombra de un árbol mide 16 m. ¿Cuánto mide el árbol?", choices: ["32 m", "16 m", "4 m", "8 m"], hint: "Cada sombra es el doble de larga que lo que la hace.", explain: "Las sombras son el doble de largas que las cosas que las hacen, así que el árbol mide 16 ÷ 2 = 8 m." },
      { q: "Una luz se aleja de un juguete. ¿Qué le pasa a la sombra del juguete?", choices: ["Se hace más grande", "Se hace más pequeña", "Se vuelve verde"], hint: "Acuérdate del laboratorio, pero al revés.", explain: "Más lejos de la luz, el juguete tapa menos luz, así que la sombra se hace más pequeña." }
    ]
  },
  'p4-forest-dew-frost': {
    title: "Lluvia, rocío y escarcha",
    topicName: "Los estados de la materia",
    blurb: "¿De dónde sale el rocío de la mañana? Derrite, calienta y hierve agua en el Laboratorio de la Naturaleza.",
    reading: [
      { title: "Tres estados del agua", text: "El agua puede ser sólida (hielo), líquida (agua) o gaseosa (vapor de agua). Al calentarla o enfriarla, cambia de un estado a otro." },
      { title: "Los árboles sueltan agua", text: "Los árboles suben agua desde el suelo, y mucha se escapa como vapor de agua por unos agujeritos diminutos de sus hojas. Un árbol grande puede soltar más de 100 litros de agua en un día de calor." },
      { title: "Rocío y escarcha", text: "En una noche fresca y despejada, las hojas se enfrían. El vapor de agua del aire vuelve a convertirse en gotitas sobre ellas: eso es el rocío. Cuando hace menos de 0 °C, el vapor se convierte directamente en cristales de hielo: eso es la escarcha." },
      { title: "Al derretirse se queda en 0 °C", text: "Cuando el hielo se derrite, su temperatura se queda en 0 °C hasta que se ha derretido todo. El calor se usa para convertir el hielo en agua, no para calentarlo." }
    ],
    sim: {
      predict: {
        q: "En el laboratorio, calientas hielo que empieza a −10 °C. Mientras el hielo se derrite, ¿qué marca el termómetro?",
        choices: ["Sigue subiendo rápido", "Se queda en 0 °C hasta que se derrite todo el hielo", "Baja por debajo de −10 °C"],
        explain: "Mientras el hielo se derrite, el calor se usa para convertir el hielo en agua, así que la temperatura se queda en 0 °C. Cuando ya no queda hielo, el agua vuelve a calentarse."
      }
    },
    quiz: [
      { q: "¿Cuáles son los tres estados del agua?", choices: ["Hielo, agua y vapor de agua", "Lluvia, nieve y viento", "Caliente, frío y templado"], hint: "Sólido, líquido y gas.", explain: "El agua puede ser hielo sólido, agua líquida o vapor de agua, que es un gas." },
      { q: "¿Qué es el rocío?", choices: ["Lluvia de la semana pasada", "Jugo de las hojas", "Vapor de agua que se convirtió en gotitas sobre las hojas frías"], hint: "Se forma en las noches frescas y despejadas.", explain: "El rocío se forma cuando el vapor de agua del aire se enfría sobre las hojas frías y vuelve a convertirse en gotitas de líquido." },
      { q: "¿Cuándo se forma escarcha en vez de rocío?", choices: ["En una tarde calurosa", "Cuando hace menos de 0 °C", "Cuando hace viento y calor"], hint: "La escarcha está hecha de hielo.", explain: "Cuando hace menos de 0 °C, el vapor de agua se convierte directamente en cristales de hielo: la escarcha." },
      { q: "¿A qué temperatura hierve el agua al nivel del mar?", choices: ["0 °C", "50 °C", "200 °C", "100 °C"], hint: "Mira la marca de arriba del termómetro del laboratorio.", explain: "Al nivel del mar, el agua hierve a 100 °C y se convierte en vapor." },
      { q: "¿Cómo pasa el agua del suelo al aire a través de un árbol?", choices: ["Sube por el tronco y sale como vapor por agujeritos diminutos de las hojas", "Las ardillas la suben", "Las raíces la bombean hasta las nubes"], hint: "Piensa en las hojas.", explain: "El agua sube desde las raíces, pasa por el tronco y se escapa como vapor de agua por los agujeritos diminutos de las hojas." }
    ]
  },

  // ── Anillo 5: Altos del Nido ──
  'p5-forest-branch-seesaw': {
    title: "El balancín de rama",
    topicName: "Palancas",
    blurb: "Equilibra bolsas de bellotas y de piñas sobre una rama caída: peso × distancia.",
    reading: [
      { title: "Una palanca", text: "Una palanca es una barra que gira alrededor de un punto llamado pivote. Una rama caída apoyada sobre un tronco forma una palanca de balancín." },
      { title: "El efecto de giro", text: "Cuánto hace girar un peso a la palanca depende de dos cosas: de lo pesado que es y de lo lejos que está del pivote. Peso × distancia se llama momento." },
      { title: "Equilibrar", text: "Una palanca está en equilibrio cuando los momentos de los dos lados son iguales. 2 kg a 2 pasos del pivote equilibran 1 kg a 4 pasos, porque 2 × 2 = 1 × 4." },
      { title: "Palancas en el bosque", text: "Desde hace mucho tiempo, la gente mueve troncos y rocas pesados usando palos fuertes como palancas. Una palanca larga deja que un empujón pequeño mueva una carga pesada." }
    ],
    sim: {
      predict: {
        q: "Una bolsa de bellotas de 1 kg está a 4 pasos del pivote, a la derecha. ¿Dónde hay que poner una bolsa de piñas de 2 kg, a la izquierda, para equilibrarla?",
        choices: ["A 4 pasos", "A 1 paso", "A 2 pasos"],
        explain: "1 kg × 4 pasos = 4, y 2 kg × 2 pasos = 4. Los momentos son iguales, así que la rama queda en equilibrio."
      }
    },
    quiz: [
      { q: "¿Cómo se llama el punto alrededor del cual gira una palanca?", choices: ["El pivote", "La corteza", "El mango"], hint: "En un balancín está en el medio.", explain: "Una palanca gira alrededor de un punto llamado pivote." },
      { q: "Una bolsa de 3 kg está a 2 pasos del pivote. ¿Cuál es su momento (peso × distancia)?", choices: ["5", "6", "1"], hint: "Multiplica el peso por la distancia.", explain: "3 kg × 2 pasos = 6." },
      { q: "Hay 2 kg a 3 pasos, a la izquierda. ¿Dónde hay que poner 3 kg, a la derecha, para equilibrarlos?", choices: ["A 3 pasos", "A 1 paso", "A 2 pasos"], hint: "El momento del lado izquierdo es 2 × 3 = 6.", explain: "2 × 3 = 6 a la izquierda, y 3 × 2 = 6 a la derecha. A 2 pasos queda en equilibrio." },
      { q: "Un niño pesado y un niño ligero se suben a un balancín. ¿Cómo pueden equilibrarse?", choices: ["El niño pesado se sienta más cerca del pivote", "El niño pesado se sienta más lejos del pivote", "Los dos saltan"], hint: "La distancia puede compensar el peso.", explain: "Si se acerca al pivote, el momento del niño pesado se hace más pequeño, así que los dos lados pueden quedar iguales." },
      { q: "¿Por qué un palo largo te ayuda a levantar un tronco pesado?", choices: ["Los palos largos son magnéticos", "El tronco se vuelve más ligero", "Los palos largos son más blandos", "Una palanca larga deja que un empujón pequeño haga un gran efecto de giro"], hint: "Momento = peso × distancia.", explain: "Empujar lejos del pivote da un momento grande, así que un empujón pequeño puede levantar una carga pesada que está cerca del pivote." }
    ]
  },
  'p5-forest-swinging-vine': {
    title: "La liana que se balancea",
    topicName: "Péndulos",
    blurb: "Balancéate en una liana corta y en una larga. ¿Qué decide cuánto tarda cada balanceo?",
    reading: [
      { title: "Un péndulo", text: "Un peso que cuelga de una liana o de una cuerda y se balancea de un lado a otro es un péndulo. Cada balanceo tarda el mismo tiempo, una y otra vez." },
      { title: "La longitud importa", text: "Una liana más larga hace balanceos más lentos. Una liana 4 veces más larga tarda el doble en cada balanceo." },
      { title: "El peso no", text: "¡Sorpresa! Un peso pesado y uno ligero, en lianas de la misma longitud, se balancean en el mismo tiempo." },
      { title: "Relojes y columpios", text: "Como cada balanceo tarda el mismo tiempo, los péndulos se usaron para medir el tiempo en los relojes. ¡Un columpio del parque también es un péndulo!" }
    ],
    sim: {
      predict: {
        q: "En el laboratorio, el péndulo A cuelga de una liana corta de 0,5 m con un peso ligero. El péndulo B cuelga de una liana larga de 2 m con un peso pesado. ¿Cuál va y viene más veces en el mismo tiempo?",
        choices: ["B, el largo con el peso pesado", "A, el corto", "Los dos se balancean el mismo número de veces"],
        explain: "Una liana más corta da balanceos más rápidos. A tarda unos 1,4 s en cada balanceo, pero B tarda unos 2,8 s. El peso pesado no cambia nada: solo importa la longitud."
      }
    },
    quiz: [
      { q: "¿Qué cambia cuánto tarda cada balanceo de un péndulo?", choices: ["La longitud de la liana", "El color del peso", "Lo pesado que es el peso"], hint: "Acuérdate de los péndulos A y B.", explain: "Solo la longitud cambia el tiempo del balanceo. Una liana más larga quiere decir balanceos más lentos." },
      { q: "Una guardabosques cambia un peso ligero por uno pesado en la misma liana. ¿Qué le pasa al tiempo del balanceo?", choices: ["Se hace mucho más largo", "Sigue igual", "Se hace mucho más corto"], hint: "El peso no importa.", explain: "El tiempo del balanceo sigue igual, porque la longitud de la liana no ha cambiado." },
      { q: "Una liana se hace 4 veces más larga. ¿Cómo cambia el tiempo de cada balanceo?", choices: ["Se reduce a la mitad", "Se hace 4 veces más largo", "Se duplica"], hint: "4 veces la longitud, pero no 4 veces el tiempo.", explain: "El tiempo del balanceo depende de la raíz cuadrada de la longitud. √4 = 2, así que cada balanceo tarda el doble." },
      { q: "Un péndulo de 1 m tarda 2 s en cada balanceo. ¿Más o menos cuánto tardaría un péndulo de 4 m?", choices: ["4 s", "8 s", "2 s", "1 s"], hint: "4 veces la longitud quiere decir el doble de tiempo.", explain: "4 veces la longitud duplica el tiempo del balanceo: 2 s × 2 = 4 s." },
      { q: "¿Por qué se usaban péndulos en los relojes?", choices: ["Son bonitos", "Nunca se paran", "Son muy pesados", "Cada balanceo tarda el mismo tiempo"], hint: "Un reloj necesita un ritmo constante.", explain: "Cada balanceo tarda el mismo tiempo, así que un péndulo le da a un reloj un ritmo constante." }
    ]
  },

  // ── Anillo 6: Anillos de Girasol ──
  'p6-forest-puddle-reflections': {
    title: "Reflejos en el charco",
    topicName: "La reflexión de la luz",
    blurb: "¿Por qué un charco quieto muestra los árboles al revés? Haz rebotar la luz en un espejo para descubrirlo.",
    reading: [
      { title: "La luz rebota", text: "Cuando la luz llega a una superficie, una parte rebota. Esto se llama reflexión. Vemos casi todas las cosas porque la luz se refleja en ellas y llega a nuestros ojos." },
      { title: "La ley de la reflexión", text: "Mide los ángulos desde la normal: una línea imaginaria perpendicular al espejo. El ángulo con el que llega la luz (de incidencia) siempre es igual al ángulo con el que sale rebotada (de reflexión)." },
      { title: "Quieto u ondulado", text: "Un charco quieto es liso como un espejo, así que refleja la luz de forma ordenada y muestra una imagen clara de los árboles. Cuando el viento hace ondas, la luz rebota en muchas direcciones y la imagen se rompe." },
      { title: "Árboles al revés", text: "La luz que sale de la copa de un árbol llega al charco en un punto más lejano de ti y luego rebota hacia arriba hasta tus ojos. Tu cerebro sigue la luz hacia atrás en línea recta, así que la copa parece estar muy hondo bajo el agua." }
    ],
    sim: {
      predict: {
        q: "En el laboratorio, el rayo de luz llega al espejo a 30° de la normal. ¿Con qué ángulo respecto a la normal rebotará?",
        choices: ["60°", "30°", "0°"],
        explain: "El ángulo de reflexión siempre es igual al ángulo de incidencia: entra a 30° y sale a 30°."
      }
    },
    quiz: [
      { q: "Un rayo de luz llega a un estanque quieto a 40° de la normal. ¿Con qué ángulo respecto a la normal se refleja?", choices: ["50°", "80°", "40°"], hint: "El ángulo de entrada es igual al ángulo de salida.", explain: "El ángulo de reflexión es igual al ángulo de incidencia, así que se refleja a 40°." },
      { q: "¿Qué es la normal?", choices: ["Una línea imaginaria perpendicular a la superficie", "La parte más brillante del rayo", "Un tipo de espejo"], hint: "Los ángulos se miden desde ella.", explain: "La normal es una línea imaginaria perpendicular (a 90°) a la superficie. Los ángulos de incidencia y de reflexión se miden desde ella." },
      { q: "¿Por qué un charco con ondas muestra una imagen borrosa?", choices: ["El agua se oscurece", "La luz rebota en las ondas en muchas direcciones diferentes", "Las ondas se tragan toda la luz"], hint: "Cada onda está inclinada de una forma distinta.", explain: "Cada trocito de una superficie con ondas está inclinado de forma distinta, así que la luz rebota en muchas direcciones y la imagen se rompe." },
      { q: "Un rayo se refleja en un espejo a 25° de la normal. ¿Cuál era el ángulo de incidencia?", choices: ["50°", "65°", "90°", "25°"], hint: "Los dos ángulos siempre son iguales.", explain: "El ángulo de incidencia es igual al ángulo de reflexión, así que era de 25°." },
      { q: "¿Por qué los árboles se ven al revés en un charco quieto?", choices: ["Los charcos están llenos de árboles al revés", "La luz de la copa rebota en la parte más lejana del charco, así que la copa se ve más abajo", "El agua pone la luz al revés por arte de magia"], hint: "Sigue la luz desde la copa del árbol.", explain: "La luz de la copa se refleja en la parte del charco más lejana de ti, así que tus ojos ven la copa del árbol más abajo que todo lo demás." }
    ]
  },
  'p6-forest-animal-race': {
    title: "La carrera de los animales del bosque",
    topicName: "Velocidad, distancia y tiempo",
    blurb: "Un ciervo echa una carrera con un erizo: usa distancia = velocidad × tiempo para calcular la ventaja.",
    reading: [
      { title: "¿Qué es la velocidad?", text: "La velocidad te dice cuánta distancia recorre algo en un tiempo determinado. Una velocidad de 4 m/s quiere decir 4 metros cada segundo." },
      { title: "La fórmula", text: "Distancia = velocidad × tiempo. Velocidad = distancia ÷ tiempo. Tiempo = distancia ÷ velocidad. Si conoces dos de ellas, puedes hallar la tercera." },
      { title: "Velocidades del bosque", text: "Un ciervo corriendo puede ir a más de 10 m/s. Una ardilla puede salir disparada a unos 5 m/s. Un erizo trota a menos de 2 m/s." },
      { title: "Velocidad media", text: "Los animales aceleran y frenan. Velocidad media = distancia total ÷ tiempo total. Una ardilla que corre 60 m en 20 s tiene una velocidad media de 3 m/s." }
    ],
    sim: {
      predict: {
        q: "En el laboratorio, el carrito A (el ciervo) va a 4 m/s y el carrito B (el erizo) va a 2 m/s. Corren durante 5 segundos. ¿Cuánta ventaja le saca el ciervo al final?",
        choices: ["2 m", "10 m", "20 m"],
        explain: "El ciervo recorre 4 × 5 = 20 m y el erizo recorre 2 × 5 = 10 m, así que el ciervo le saca 20 − 10 = 10 m de ventaja."
      }
    },
    quiz: [
      { q: "Un zorro trota a 3 m/s durante 8 segundos. ¿Qué distancia recorre?", choices: ["11 m", "24 m", "38 m"], hint: "Distancia = velocidad × tiempo.", explain: "3 m/s × 8 s = 24 m." },
      { q: "Un conejo corre 45 m en 9 segundos. ¿Cuál es su velocidad media?", choices: ["5 m/s", "36 m/s", "405 m/s"], hint: "Velocidad = distancia ÷ tiempo.", explain: "45 m ÷ 9 s = 5 m/s." },
      { q: "Un erizo trota 30 m a 1,5 m/s. ¿Cuánto tarda?", choices: ["45 s", "15 s", "20 s"], hint: "Tiempo = distancia ÷ velocidad.", explain: "30 m ÷ 1,5 m/s = 20 s." },
      { q: "Una ardilla corre 60 m en 20 s. Un ciervo corre 100 m en 10 s. ¿Cuánto más rápido va el ciervo?", choices: ["40 m/s más rápido", "Van a la misma velocidad", "7 m/s más rápido", "10 veces más rápido"], hint: "Calcula primero cada velocidad en m/s.", explain: "La ardilla va a 60 ÷ 20 = 3 m/s. El ciervo va a 100 ÷ 10 = 10 m/s. 10 − 3 = 7 m/s más rápido." },
      { q: "¿Cuál de estas es una unidad de velocidad?", choices: ["kg", "m/s", "°C"], hint: "La velocidad es distancia por tiempo.", explain: "m/s quiere decir metros por segundo: una distancia dividida entre un tiempo." }
    ]
  },

  // ── Anillo 7: Corona Estelar ──
  'p7-forest-seasons-orbit': {
    title: "La órbita de la Tierra y las estaciones",
    topicName: "Las órbitas y las estaciones",
    blurb: "Lanza una luna a su órbita y descubre por qué el bosque cambia con las estaciones.",
    reading: [
      { title: "Caer alrededor", text: "Una órbita es un camino alrededor de un planeta o de una estrella. Algo que está en órbita siempre está cayendo hacia lo que rodea, pero se mueve de lado tan rápido que nunca llega a chocar." },
      { title: "Un año es una órbita", text: "La Tierra recorre unos 940 millones de km alrededor del Sol, a unos 30 km por segundo. Una órbita completa tarda unos 365,25 días. Por eso añadimos un día bisiesto cada 4 años." },
      { title: "La inclinación hace las estaciones", text: "El eje de la Tierra está inclinado unos 23,5°. Durante una parte del año, tu mitad de la Tierra se inclina hacia el Sol: los días son largos y la luz del sol es fuerte, así que es verano. Cuando se inclina hacia el otro lado, los días son cortos y es invierno." },
      { title: "No es por la distancia", text: "¡En realidad, la Tierra está más cerca del Sol a principios de enero, durante el invierno del norte! En otoño, cuando los días se acortan, muchos árboles dejan caer sus hojas para ahorrar agua y energía para el invierno." }
    ],
    sim: {
      predict: {
        q: "En el laboratorio, lanzas la luna de lado demasiado despacio. ¿Qué pasará?",
        choices: ["Se escapa al espacio", "Cae y choca contra el planeta", "Da vueltas en una órbita perfecta"],
        explain: "Si va demasiado despacio, la gravedad la hace caer antes de que pueda dar la vuelta: choca. Con la velocidad de lado justa, orbita, como la Tierra alrededor del Sol."
      }
    },
    quiz: [
      { q: "¿Qué causa principalmente las estaciones?", choices: ["La distancia de la Tierra al Sol", "La inclinación del eje de la Tierra", "La Luna tapando el Sol"], hint: "La Tierra está más cerca del Sol en enero.", explain: "La inclinación del eje de la Tierra cambia lo largos que son los días y lo fuerte que es la luz del sol, y eso hace las estaciones." },
      { q: "¿Cuánto tarda la Tierra en dar una vuelta alrededor del Sol?", choices: ["Unos 365,25 días", "Un día", "Un mes"], hint: "Eso es un año.", explain: "Una órbita tarda unos 365,25 días: un año, con un día bisiesto cada 4 años para ponerse al día." },
      { q: "¿Cuándo está la Tierra más cerca del Sol?", choices: ["En julio", "Siempre está a la misma distancia", "A principios de enero"], hint: "¡Es una sorpresa para la gente del norte!", explain: "La Tierra está más cerca del Sol a principios de enero, durante el invierno del norte. La distancia no es lo que hace las estaciones." },
      { q: "Es verano en Corea, en la mitad norte de la Tierra. ¿Qué estación es en Australia, en la mitad sur?", choices: ["Invierno", "Verano", "Primavera", "No tiene estaciones"], hint: "Cuando el norte se inclina hacia el Sol, el sur se inclina hacia el otro lado.", explain: "Cuando la mitad norte se inclina hacia el Sol, la mitad sur se inclina hacia el otro lado, así que en Australia es invierno." },
      { q: "¿Por qué la Tierra no cae en el Sol?", choices: ["En el espacio no hay gravedad", "La luz del Sol la empuja lejos", "Es demasiado ligera para caer", "Su velocidad de lado la lleva alrededor mientras cae"], hint: "Acuérdate de la luna que lanzaste en el laboratorio.", explain: "La Tierra siempre está cayendo hacia el Sol, pero su velocidad de lado la lleva alrededor, así que nunca llega a chocar: eso es una órbita." }
    ]
  },
  'p7-forest-flying-seeds': {
    title: "Semillas que vuelan",
    topicName: "La gravedad y la resistencia del aire",
    blurb: "Paracaídas de diente de león y semillas de arce que giran: pon a prueba la gravedad con aire y sin aire.",
    reading: [
      { title: "La gravedad trata igual a todas las cosas", text: "Sin aire, todos los objetos caen con la misma aceleración: unos 9,8 m/s² en la Tierra. Una pluma y una bola de bolos que se sueltan en el vacío llegan juntas al suelo." },
      { title: "La resistencia del aire", text: "En el aire, un objeto que cae aparta el aire de su camino, y el aire lo empuja en contra. Esta resistencia del aire crece a medida que el objeto cae más rápido. Cuando se iguala al peso del objeto, el objeto deja de acelerar: ha llegado a su velocidad terminal." },
      { title: "Semillas que vuelan", text: "Las plantas usan la resistencia del aire para esparcir sus semillas. El paracaídas peludito de la semilla del diente de león le da una velocidad terminal diminuta, así que hasta una brisa suave puede llevarla muy lejos. Las semillas del arce giran como las aspas de un helicóptero, y eso frena su caída para que el viento pueda alejarlas del árbol." },
      { title: "Mucha superficie, poco peso", text: "El truco es tener mucha superficie para muy poco peso. Una semilla que cae despacio pasa más tiempo en el aire, así que el viento tiene más tiempo para llevarla a un lugar nuevo." }
    ],
    sim: {
      predict: {
        q: "En el laboratorio, primero quitas todo el aire (haces el vacío). Luego sueltas una pluma y una bola de bolos a la vez. ¿Cuál llega primero?",
        choices: ["La bola de bolos", "La pluma", "Llegan al mismo tiempo"],
        explain: "Sin aire no hay resistencia del aire, y la gravedad acelera todo al mismo ritmo, así que llegan juntas. Vuelve a poner el aire, y la pluma bajará flotando como una semilla de diente de león."
      }
    },
    quiz: [
      { q: "¿Qué es la velocidad terminal?", choices: ["La velocidad máxima constante que se alcanza cuando la resistencia del aire es igual al peso", "La velocidad de la luz", "La velocidad justo al empezar a caer"], hint: "El objeto deja de acelerar.", explain: "Cuando la resistencia del aire crece hasta igualar el peso, las fuerzas se equilibran y el objeto cae a una velocidad constante: su velocidad terminal." },
      { q: "¿Cómo frena su caída una semilla de arce?", choices: ["Es muy pesada", "Gira como el aspa de un helicóptero", "Se queda pegada a la rama"], hint: "Mira cómo baja dando vueltas en otoño.", explain: "Una semilla de arce gira como el aspa de un helicóptero, y eso hace mucha resistencia del aire y frena su caída." },
      { q: "En la Luna no hay aire. Un astronauta suelta una pluma y un martillo a la vez. ¿Qué pasa?", choices: ["El martillo llega primero", "La pluma se va flotando", "Llegan juntos"], hint: "Sin aire no hay resistencia del aire.", explain: "Sin resistencia del aire, la gravedad acelera a los dos al mismo ritmo, así que llegan juntos. Un astronauta lo hizo de verdad en la Luna en 1971." },
      { q: "¿Por qué la semilla del diente de león tiene un paracaídas peludito?", choices: ["Para ser más pesada", "Para verse bonita", "Para no pasar frío", "Para hacer mucha resistencia del aire y que el viento la lleve lejos"], hint: "Mucha superficie, poco peso.", explain: "El paracaídas hace mucha resistencia del aire con muy poco peso, así que la semilla cae despacio y el viento la lleva lejos." },
      { q: "¿Por qué es bueno que las semillas de un árbol vuelen lejos?", choices: ["A los árboles no les gustan sus semillas", "Pueden caer en lugares nuevos con más luz y sitio para crecer", "Las semillas necesitan pasar frío"], hint: "Piensa en la sombra que hay debajo del árbol.", explain: "Las semillas que caen lejos encuentran lugares nuevos con más luz y más sitio, en vez de crecer a la sombra de su árbol." }
    ]
  }
};
