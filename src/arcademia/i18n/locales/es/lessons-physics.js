/** Español — Physics lessons (overlay on content/physics.js; text only). */
export default {
  'p1-push-and-pull': {
    title: 'Empujar y tirar',
    topicName: 'Empujones y tirones (fuerzas)',
    blurb: 'Empujar y tirar hace que las cosas se muevan, se paren y giren.',
    reading: [
      { title: 'Empujar y tirar', text: 'Al empujar algo, lo alejas de ti. Al tirar de algo, lo acercas a ti. Los empujones y los tirones se llaman fuerzas.' },
      { title: 'Arrancar y parar', text: 'Una pelota se queda quieta hasta que la pateas. ¡Una patada es un empujón! Cuando atrapas la pelota, tus manos la empujan hacia atrás y se para.' },
      { title: 'Más rápido y más lento', text: 'Si empujas un columpio más fuerte, va más rápido. Una alfombra suave y peluda roza un cochecito de juguete que rueda y lo frena.' },
      { title: 'Cambiar de dirección', text: 'Un empujón puede cambiar hacia dónde va algo. Lo haces cuando pateas una pelota que rueda para pasársela a un amigo.' }
    ],
    sim: {
      predict: {
        q: 'El cochecito baja rodando por la rampa. ¿Se parará antes sobre la madera lisa o sobre la alfombra peluda?',
        choices: ['Sobre la madera lisa', 'Sobre la alfombra peluda'],
        explain: 'La alfombra peluda roza las ruedas y frena el coche, así que se para antes. Sobre la madera lisa rueda mucho más lejos.'
      }
    },
    quiz: [
      { q: 'Abres un cajón moviéndolo hacia ti. ¿Es un empujón o un tirón?', choices: ['Un empujón', 'Un tirón'], hint: '¿El cajón viene hacia ti o se aleja de ti?', explain: 'Mover algo hacia ti es tirar de ello.' },
      { q: 'Una pelota está quieta en el césped. ¿Qué puede hacer que empiece a rodar?', choices: ['Mirarla', 'Decir su nombre', 'Una patada o un empujón'], hint: 'Algo tiene que tocar la pelota y moverla.', explain: 'Las cosas se quedan quietas hasta que una fuerza, como un empujón o una patada, las mueve.' },
      { q: 'Empujas un cochecito de juguete suave y luego fuerte. ¿Cuándo va más rápido?', choices: ['Cuando lo empujas fuerte', 'Cuando lo empujas suave', 'Va igual las dos veces'], hint: 'Piensa en empujar un columpio.', explain: 'Un empujón más grande hace que algo acelere más, así que el coche va más rápido.' },
      { q: 'Un amigo te pasa una pelota rodando. ¿Cómo puedes pararla?', choices: ['Dar una palmada', 'Silbarle', 'Atraparla con las manos'], hint: 'Para pararla, algo tiene que empujar la pelota hacia atrás.', explain: 'Tus manos empujan la pelota hacia atrás. Ese empujón hace que se pare.' },
      { q: '¿Cuál de estos es un tirón?', choices: ['Patear una pelota', 'Abrir una puerta hacia ti', 'Apretar un timbre'], hint: '¿Cuál acerca algo a ti?', explain: 'Cuando abres una puerta hacia ti, tiras de ella. Patear y apretar son empujones.' }
    ]
  },
  'p1-float-or-sink': {
    title: '¿Flota o se hunde?',
    topicName: 'Flotar y hundirse',
    blurb: '¡Chof! Echa cosas al tanque de agua. ¿Cuáles se quedan flotando arriba?',
    reading: [
      { title: 'Flotar', text: 'Algunas cosas se quedan encima del agua. Decimos que flotan. Tu patito de goma flota en la bañera.' },
      { title: 'Hundirse', text: 'Algunas cosas bajan hasta el fondo. Decimos que se hunden. Una piedra se hunde en un estanque.' },
      { title: 'Ser grande no es la respuesta', text: '¡Una manzana grande flota, pero una moneda pequeñita se hunde! Ser grande no hace que algo se hunda. Depende de qué está hecho y de su forma.' },
      { title: 'Barcos', text: '¡Un barco enorme está hecho de metal, pero flota! Su forma es como un tazón gigante lleno de aire, y eso lo ayuda a flotar.' }
    ],
    sim: {
      predict: {
        q: '¿Cuál flotará: la manzana grande o la llave pequeña?',
        choices: ['La manzana grande', 'La llave pequeña'],
        explain: '¡La manzana flota! Las manzanas tienen muchos huequitos de aire por dentro. La llave es de metal, así que se hunde, aunque sea pequeña.'
      }
    },
    quiz: [
      { q: 'Cuando algo se queda encima del agua, decimos que…', choices: ['se hunde', 'flota', 'se derrite'], hint: 'Piensa en tu patito de goma en la bañera.', explain: 'Las cosas que se quedan encima del agua flotan.' },
      { q: '¿Qué hará una piedra en un estanque?', choices: ['Hundirse', 'Flotar'], hint: '¿Alguna vez has tirado una piedra al agua? ¿Adónde fue?', explain: 'Una piedra se hunde hasta el fondo del estanque.' },
      { q: '¿Cuál de estos flota en la bañera?', choices: ['Una cuchara de metal', 'Una canica de vidrio', 'Un patito de goma'], hint: '¿Cuál es un juguete de baño?', explain: 'Un patito de goma flota. Una cuchara de metal y una canica de vidrio se hunden.' },
      { q: 'Echas un cubito de hielo en tu bebida. ¿Qué hace?', choices: ['Flota', 'Se hunde hasta el fondo'], hint: 'Mira un vaso de jugo con hielo. ¿Dónde está el hielo?', explain: '¡El hielo flota! Por eso los cubitos se quedan arriba en tu bebida.' },
      { q: 'Un tronco grande de madera y una moneda pequeña caen a un lago. ¿Cuál se hunde?', choices: ['El tronco grande', 'La moneda pequeña', 'Los dos se hunden'], hint: 'Recuerda la manzana: ser grande no significa que se vaya a hundir.', explain: 'La moneda pequeña de metal se hunde. El tronco grande de madera flota, porque la madera flota.' }
    ]
  },
  'p1-light-and-shadow': {
    title: 'Luz y sombras',
    topicName: 'La luz y las sombras',
    blurb: 'Alumbra un juguete con una linterna y haz que su sombra crezca y se encoja.',
    reading: [
      { title: 'La luz va en línea recta', text: 'La luz de una linterna sale en líneas rectas. No puede doblarse para rodear las cosas.' },
      { title: 'Hacer una sombra', text: 'Cuando un juguete está en medio, tapa la luz. La mancha oscura detrás de él, adonde la luz no llega, es una sombra.' },
      { title: 'Grande y pequeña', text: 'Acerca la linterna a tu juguete y su sombra se hace grande. Aleja la linterna y la sombra se hace más pequeña.' },
      { title: 'Tu propia sombra', text: 'En un día de sol, tú también tienes sombra. Siempre apunta al lado contrario del sol. Al atardecer, cuando el sol está bajo, se hace larga.' }
    ],
    sim: {
      predict: {
        q: 'Acercas la linterna al osito. ¿Qué le pasa a su sombra?',
        choices: ['Se hace más grande', 'Se hace más pequeña', 'Desaparece'],
        explain: 'Cerca de la linterna, el osito tapa mucha más luz, así que queda oscura una mancha más grande. ¡Su sombra crece!'
      }
    },
    quiz: [
      { q: '¿Qué forma una sombra?', choices: ['Agua en el suelo', 'Algo que tapa la luz', 'Un ruido fuerte'], hint: 'Una sombra es un lugar adonde la luz no llega.', explain: 'Cuando algo se pone en el camino de la luz, la tapa. El lugar oscuro que queda detrás es la sombra.' },
      { q: '¿Puedes hacer una sombra en un cuarto totalmente oscuro?', choices: ['Sí, una enorme', 'No, necesitas luz'], hint: 'Una sombra se forma cuando se tapa la luz. ¿Hay alguna luz que tapar?', explain: 'Sin nada de luz, todo está oscuro, así que no hay sombra. Necesitas luz para hacer una.' },
      { q: 'Quieres hacer una sombra chinesca MUY GRANDE en la pared. ¿Dónde pones la mano?', choices: ['Cerca de la linterna', 'Lejos de la linterna'], hint: 'Recuerda qué pasó con la sombra del osito en el laboratorio.', explain: 'Cerca de la linterna, tu mano tapa mucha luz, así que la sombra en la pared es grande.' },
      { q: '¿Hacia dónde apunta tu sombra en un día de sol?', choices: ['Hacia el sol', 'Hacia arriba, al cielo', 'Al lado contrario del sol'], hint: 'Tu cuerpo tapa la luz del sol. ¿Dónde queda la mancha oscura?', explain: 'Tu cuerpo tapa la luz del sol, así que tu sombra cae en el lado contrario al sol.' },
      { q: '¿Cuál de estos hace una sombra oscura?', choices: ['Un bloque de madera', 'Una ventana de vidrio transparente', 'El aire'], hint: '¿Cuál no deja pasar nada de luz?', explain: 'La madera tapa toda la luz, así que su sombra es oscura. El vidrio transparente y el aire dejan pasar la luz.' }
    ]
  },
  'p2-magnets': {
    title: 'La magia de los imanes',
    topicName: 'Imanes',
    blurb: '¿Qué cosas atrapará un imán? ¡Algunas de metal te van a sorprender!',
    reading: [
      { title: 'La fuerza de un imán', text: 'Un imán atrae las cosas hechas de hierro o de acero. ¡Puede atraerlas incluso sin tocarlas!' },
      { title: 'No todos los metales', text: 'Una lata de refresco de aluminio es de metal, pero un imán no se pega a ella. El cobre y el oro tampoco se pegan. Los imanes atraen el hierro y el acero.' },
      { title: 'Dos extremos', text: 'Todo imán tiene dos extremos, llamados norte y sur. Un norte y un sur se atraen y se juntan. ¡Dos extremos iguales se empujan y se separan!' },
      { title: 'Imanes en casa', text: 'Los imanes sujetan dibujos en el refrigerador y mantienen cerradas algunas puertas de armario. La aguja de una brújula es un imán pequeñito que apunta al norte.' }
    ],
    sim: {
      predict: {
        q: 'La lata es de aluminio, que es un metal. ¿La atraerá el imán?',
        choices: ['Sí, los imanes atraen todos los metales', 'No, no se pegará'],
        explain: 'El aluminio es un metal, pero no es magnético. Los imanes atraen el hierro y el acero, como el clip y el clavo.'
      }
    },
    quiz: [
      { q: '¿Cuál recogerá un imán?', choices: ['Un bloque de madera', 'Un clip de acero', 'Una goma de borrar'], hint: 'Los imanes atraen el hierro y el acero.', explain: 'Los clips son de acero, así que un imán los atrae. La madera y las gomas de borrar no son magnéticas.' },
      { q: '¿Cuál de estos metales atrae un imán?', choices: ['El hierro', 'El cobre', 'El aluminio'], hint: 'Piensa en los clavos. ¿De qué están hechos?', explain: 'Los imanes atraen el hierro (y el acero, que es casi todo hierro). El cobre y el aluminio son metales, pero los imanes no los atraen.' },
      { q: 'Acercas los extremos norte de dos imanes. ¿Qué pasa?', choices: ['Se juntan de golpe', 'No pasa nada', 'Se empujan y se separan'], hint: '¿Los dos extremos son iguales o diferentes?', explain: 'Dos extremos iguales se empujan y se alejan. El norte y el sur se atraen.' },
      { q: '¿Qué hace la aguja de una brújula?', choices: ['Apunta al norte', 'Apunta al árbol más cercano', 'Da vueltas y vueltas sin parar'], hint: 'Los exploradores usan una brújula para orientarse.', explain: 'La aguja de una brújula es un imán pequeñito. La Tierra funciona como un imán gigante, así que la aguja gira para apuntar al norte.' },
      { q: '¿Puede un imán atraer un clip a través de una hoja de papel?', choices: ['No, el papel lo impide', 'Sí, la fuerza atraviesa el papel'], hint: '¿Cómo sujetan tus dibujos los imanes del refrigerador?', explain: 'La fuerza de un imán atraviesa el papel. Así es como un imán de refrigerador sujeta un dibujo.' }
    ]
  },
  'p2-falling-things': {
    title: '¡Todo se cae!',
    topicName: 'La gravedad y las caídas',
    blurb: 'Suelta una pelota y una pluma. ¿Cuál gana la carrera hasta el suelo?',
    reading: [
      { title: 'La gravedad', text: 'Cuando sueltas una pelota, se cae. La Tierra atrae todo hacia ella. Esa fuerza se llama gravedad.' },
      { title: 'Siempre hacia abajo', text: 'La gravedad tira de las cosas hacia abajo, en cualquier lugar de la Tierra. Por eso el jugo derramado va hacia abajo y no hacia arriba, y por eso vuelves al suelo después de saltar.' },
      { title: 'El aire estorba', text: 'El aire empuja en contra de las cosas que caen. Una pluma es ligera y esponjosa, así que el aire la frena mucho. Una pelota cae casi sin frenarse.' },
      { title: 'Un truco con papel', text: 'Suelta una hoja de papel plana y bajará despacio, flotando. ¡Arruga la misma hoja hasta hacer una bola y caerá rápido! El aire tiene menos donde empujar.' }
    ],
    sim: {
      predict: {
        q: 'Sueltas una pelota y una pluma a la vez. ¿Cuál llega primero al suelo?',
        choices: ['La pluma', 'La pelota', 'Llegan juntas'],
        explain: 'La pelota llega primero. El aire empuja la pluma, que es ancha y esponjosa, y la frena mucho.'
      }
    },
    quiz: [
      { q: '¿Cómo se llama la fuerza que hace que las cosas caigan?', choices: ['Gravedad', 'Magnetismo', 'Viento'], hint: 'Es la fuerza con la que la Tierra atrae todo.', explain: 'La gravedad es la fuerza con la que la Tierra atrae las cosas. Hace que caigan.' },
      { q: '¿Por qué una pluma cae tan despacio?', choices: ['A las plumas les gusta volar', 'La gravedad no atrae a las plumas', 'El aire la empuja en contra'], hint: '¿Qué estorbaba en el laboratorio?', explain: 'La gravedad tira de la pluma hacia abajo, pero el aire la empuja en contra y la frena mucho.' },
      { q: 'Sueltas a la vez una hoja de papel plana y otra arrugada. ¿Cuál llega primero?', choices: ['La hoja plana', 'La bola arrugada'], hint: '¿En cuál tiene el aire menos donde empujar?', explain: 'La bola arrugada llega primero. Es el mismo papel, pero el aire tiene menos donde empujar.' },
      { q: 'Saltas en una cama elástica. ¿Qué te hace bajar otra vez?', choices: ['El aire', 'La gravedad', 'Tus zapatos'], hint: 'Es la fuerza que hace caer todo.', explain: 'La gravedad te hace bajar a la cama elástica después de cada salto.' },
      { q: 'Se te cae la cuchara en el almuerzo. ¿Hacia dónde va?', choices: ['Abajo, al suelo', 'Arriba, al techo', 'Se queda en el aire'], hint: '¿Hacia dónde tira la gravedad?', explain: 'La gravedad tira de la cuchara hacia abajo, así que cae al suelo.' }
    ]
  },
  'p2-sounds': {
    title: 'Sonidos por todas partes',
    topicName: 'El sonido',
    blurb: 'Haz vibrar una regla y crea sonidos agudos, graves, fuertes y suaves.',
    reading: [
      { title: '¡Vibra, vibra, vibra!', text: 'Cada sonido lo hace algo que se sacude muy rápido. Esa sacudida se llama vibración. Tararea y tócate la garganta. ¿Notas el cosquilleo?' },
      { title: 'El sonido viaja', text: 'La vibración pasa por el aire hasta tus oídos. Así oyes a un amigo que te llama desde el otro lado del patio.' },
      { title: 'Agudo y grave', text: 'Una vibración rápida hace un sonido agudo, como un pajarito. Una vibración lenta hace un sonido grave, como un tambor grande. Las cuerdas cortas vibran rápido y suenan agudas.' },
      { title: 'Fuerte y suave', text: 'Si golpeas un tambor con fuerza, vibra mucho y suena fuerte. Si le das un toquecito, suena suave.' }
    ],
    sim: {
      predict: {
        q: 'Haces más corta la parte de la regla que sobresale y luego la haces vibrar. ¿Cómo sonará la nota?',
        choices: ['Más aguda', 'Más grave', 'Igual que antes'],
        explain: 'Una regla más corta vibra más rápido, y una vibración más rápida hace una nota más aguda.'
      }
    },
    quiz: [
      { q: '¿Qué produce todos los sonidos?', choices: ['La luz que brilla', 'Algo que se sacude, llamado vibración', 'Las cosas que se enfrían'], hint: 'Recuerda cuando tarareabas con la mano en la garganta.', explain: 'Todo sonido empieza con algo que se sacude, o vibra.' },
      { q: '¿Qué hace una nota más aguda?', choices: ['Una cuerda corta', 'Una cuerda larga'], hint: '¿Cuál vibra más rápido?', explain: 'Una cuerda corta vibra más rápido, y una vibración más rápida hace una nota más aguda.' },
      { q: '¿Cómo haces que un tambor suene más fuerte?', choices: ['Tocarlo más suave', 'Pintarlo de rojo', 'Golpearlo más fuerte'], hint: 'Un sonido fuerte necesita una gran sacudida.', explain: 'Golpear más fuerte hace que el tambor vibre más, así que suena más fuerte.' },
      { q: 'Un león grande ruge y un ratoncito chilla. ¿Qué sonido es más grave?', choices: ['El rugido del león', 'El chillido del ratón'], hint: 'Las cosas grandes suelen vibrar despacio.', explain: 'El rugido del león es grave. El chillido del ratón es agudo.' },
      { q: '¿Cómo llega a tus oídos el sonido de una campana?', choices: ['Por un cable escondido', 'La vibración viaja por el aire', 'No viaja para nada'], hint: '¿Qué hay a tu alrededor, entre tú y la campana?', explain: 'La campana hace vibrar el aire, y la vibración viaja por el aire hasta tus oídos.' }
    ]
  },
  'p3-friction': {
    title: 'Fricción: la fuerza que agarra',
    topicName: 'La fricción',
    blurb: '¿Por qué un coche se desliza veloz por el hielo pero se para enseguida en la alfombra?',
    reading: [
      { title: '¿Qué es la fricción?', text: 'La fricción es una fuerza que aparece cuando dos superficies se rozan. Siempre va en contra del movimiento, así que frena las cosas.' },
      { title: 'Áspero y liso', text: 'Las superficies ásperas y con bultitos, como la alfombra y la arena, hacen mucha fricción. Las superficies lisas y resbaladizas, como el hielo, hacen muy poca, así que las cosas se deslizan muy lejos.' },
      { title: 'La fricción da calor', text: 'Frótate las manos rápido. ¿Notas cómo se calientan? La fricción convierte parte del movimiento en calor.' },
      { title: 'Dónde lo ves', text: 'Los frenos de la bici aprietan la rueda para frenarte con fricción. Las suelas de los zapatos tienen dibujos que agarran para que no resbales, y la gente echa arena o gravilla en los caminos helados.' }
    ],
    sim: {
      predict: {
        q: 'El mismo coche baja por la misma rampa hasta el hielo, la madera y la alfombra. ¿En qué suelo rodará más lejos?',
        choices: ['Alfombra', 'Madera', 'Hielo'],
        explain: 'El hielo es el más liso, así que tiene la menor fricción para frenar el coche. El coche rueda más lejos sobre el hielo y se para antes sobre la alfombra.'
      }
    },
    quiz: [
      { q: 'La fricción es una fuerza que…', choices: ['levanta las cosas por el aire', 'frena las cosas que se rozan', 'hace las cosas más pesadas'], hint: '¿Qué le pasó al coche en la alfombra?', explain: 'La fricción actúa entre superficies que se rozan, y va en contra del movimiento.' },
      { q: '¿Qué superficie tiene menos fricción?', choices: ['El hielo', 'El papel de lija', 'Un felpudo'], hint: '¿Cuál es resbaladiza?', explain: 'El hielo es muy liso y resbaladizo, así que tiene la menor fricción.' },
      { q: '¿Por qué la gente se frota las manos en un día frío?', choices: ['Para limpiarlas', 'Para enfriar el aire', 'La fricción las calienta'], hint: '¿En qué convierte la fricción parte del movimiento?', explain: 'Frotar produce fricción, y la fricción convierte parte del movimiento en calor.' },
      { q: '¿De qué te sirve la fricción cuando vas en bici?', choices: ['Hace la bici más ligera', 'Los frenos la usan para frenarte', 'Hace sonar el timbre'], hint: 'Piensa en qué pasa cuando aprietas las manetas del freno.', explain: 'Las pastillas de freno rozan la rueda. Esa fricción frena la rueda para que puedas parar sin peligro.' }
    ]
  },
  'p3-simple-circuits': {
    title: '¡Enciéndela!',
    topicName: 'Circuitos eléctricos',
    blurb: 'Cierra el circuito para encender una bombilla. ¿Qué cosas dejan pasar la electricidad?',
    reading: [
      { title: 'Una vuelta completa', text: 'La electricidad sale de una pila, pasa por los cables y una bombilla, y vuelve a la pila. Este camino tiene que ser una vuelta completa, llamada circuito. Si hay cualquier hueco, la bombilla se apaga.' },
      { title: 'Interruptores', text: 'Un interruptor es un hueco que puedes abrir y cerrar. Cuando está cerrado, la vuelta está completa y la luz se enciende. Cuando está abierto, la electricidad se detiene.' },
      { title: 'Conductores y aislantes', text: 'Los materiales que dejan pasar la electricidad se llaman conductores, como los metales cobre, aluminio y hierro. Los materiales que la bloquean son aislantes, como el plástico, la goma, la madera y el papel.' },
      { title: 'Dónde lo ves', text: 'Un cable es cobre por dentro con una funda de plástico: el cobre lleva la electricidad y el plástico protege los dedos. Nunca metas nada en un enchufe de la pared; su electricidad es tan fuerte que puede hacerte daño.' }
    ],
    sim: {
      predict: {
        q: '¿Cuál de estos hará que se encienda la bombilla si lo usas para cerrar el hueco?',
        choices: ['Una pajita de plástico', 'Una tira de papel de aluminio', 'Una goma elástica'],
        explain: 'El papel de aluminio es un metal, así que es un conductor: completa la vuelta y la bombilla se enciende. El plástico y la goma son aislantes.'
      }
    },
    quiz: [
      { q: '¿Por qué se apaga la bombilla cuando hay un hueco en el circuito?', choices: ['La pila se queda dormida', 'La vuelta se rompe, así que la electricidad deja de fluir', 'La bombilla está demasiado llena de electricidad'], hint: 'La electricidad necesita un camino completo, que dé toda la vuelta.', explain: 'La electricidad solo puede fluir por una vuelta completa. Un hueco rompe la vuelta, así que el flujo se detiene.' },
      { q: '¿Cuál de estos es un conductor?', choices: ['Un clavo de hierro', 'Una goma elástica', 'Un palito de madera'], hint: 'Los conductores suelen ser metales.', explain: 'El hierro es un metal, así que conduce la electricidad. La goma y la madera son aislantes.' },
      { q: '¿Por qué los cables están cubiertos de plástico?', choices: ['El plástico hace que la electricidad vaya más rápido', 'Solo para que se vean bonitos', 'El plástico es aislante, así que te protege'], hint: '¿Deja pasar la electricidad el plástico?', explain: 'El plástico es aislante. Impide que la electricidad llegue a tus dedos.' },
      { q: 'Cuando apagas una luz, ¿qué hace el interruptor?', choices: ['Abre un hueco en la vuelta', 'Gasta la pila', 'Enfría la bombilla'], hint: 'Piensa en qué le hace un hueco a un circuito.', explain: 'Apagar un interruptor abre un hueco que rompe el circuito, así que la electricidad deja de fluir.' }
    ]
  },
  'p4-levers': {
    title: 'Palancas y equilibrio',
    topicName: 'Palancas',
    blurb: 'Equilibra el balancín y descubre por qué la distancia es un superpoder.',
    reading: [
      { title: '¿Qué es una palanca?', text: 'Una palanca es una barra rígida que gira alrededor de un punto fijo llamado pivote, o fulcro. Un balancín (o subibaja) es una palanca con el pivote en el medio.' },
      { title: 'La distancia importa', text: 'Cuánto hace girar un peso a una palanca depende de lo pesado que es Y de lo lejos que está del pivote. Una niña sentada lejos del centro puede equilibrar a una persona adulta más pesada sentada cerca.' },
      { title: 'La regla del equilibrio', text: 'Un balancín se equilibra cuando peso × distancia es igual en los dos lados. Una bolsa de 2 kg a 3 pasos equilibra una bolsa de 3 kg a 2 pasos, porque 2 × 3 = 3 × 2.' },
      { title: 'Dónde lo ves', text: 'Las tijeras, los abrebotellas, las patas de cabra y las carretillas son palancas. Empujar lejos del pivote permite que un empujón pequeño haga una fuerza grande. ¡Se dice que el pensador griego Arquímedes presumía de que, con una palanca lo bastante larga, podría mover el mundo!' }
    ],
    sim: {
      predict: {
        q: 'Un peso pesado está cerca del pivote en un lado. ¿Dónde deberías poner un peso más ligero para equilibrarlo?',
        choices: ['Cerca del pivote, en el otro lado', 'Lejos del pivote, en el otro lado', 'Encima del peso pesado'],
        explain: 'La distancia compensa el peso. Un peso más ligero puesto lejos del pivote puede equilibrar uno más pesado puesto cerca.'
      }
    },
    quiz: [
      { q: '¿Cómo se llama el punto fijo alrededor del cual gira una palanca?', choices: ['El mango', 'El pivote (o fulcro)', 'La carga'], hint: 'En un balancín, es la parte del medio que no se mueve.', explain: 'Una palanca gira alrededor de su pivote, también llamado fulcro.' },
      { q: 'Un peso de 4 kg está a 1 paso del pivote. ¿Dónde tiene que estar un peso de 1 kg en el otro lado para equilibrarlo?', choices: ['A 4 pasos', 'A 1 paso', 'A 2 pasos'], hint: 'Haz que peso × distancia sea igual en los dos lados.', explain: '4 kg × 1 paso = 4, y 1 kg × 4 pasos = 4. Los dos lados coinciden, así que se equilibra.' },
      { q: 'Quieres abrir una puerta pesada con el menor esfuerzo. ¿Dónde deberías empujar?', choices: ['Justo al lado de las bisagras', 'Lejos de las bisagras, cerca de la manija'], hint: 'Las bisagras son el pivote de la puerta.', explain: 'Empujar lejos del pivote da un efecto de giro mayor, así que la puerta se abre con más facilidad.' },
      { q: '¿Cuál de estos es una palanca?', choices: ['Una pelota de goma', 'Un vaso de agua', 'Un abrebotellas'], hint: 'Busca una barra rígida que gire alrededor de un punto.', explain: 'Un abrebotellas es una barra que gira alrededor de un pivote apoyado en la tapa, así que un empujón pequeño en su mango largo levanta la tapa.' }
    ]
  },
  'p4-states-of-matter': {
    title: 'Hielo, agua, vapor',
    topicName: 'Estados de la materia',
    blurb: 'Convierte el hielo en agua y el agua en vapor, y no pierdas de vista el termómetro.',
    reading: [
      { title: 'Sólido, líquido, gas', text: 'La materia tiene tres estados principales. Los sólidos mantienen su forma, como el hielo. Los líquidos fluyen y toman la forma del recipiente, como el agua. Los gases se extienden hasta llenar cualquier espacio, como el vapor.' },
      { title: 'Derretir y congelar', text: 'Calienta el hielo y a 0 °C se derrite y se convierte en agua. Enfría el agua hasta 0 °C y se congela otra vez en hielo. Es lo mismo, pero en otro estado.' },
      { title: 'Hervir', text: 'Si sigues calentando, al nivel del mar el agua hierve a 100 °C y se convierte en un gas invisible llamado vapor de agua. La nube blanca que sale de un hervidor son en realidad gotitas diminutas que se han enfriado y han vuelto a ser líquido.' },
      { title: 'Dónde lo ves', text: 'En lo alto de una montaña la presión del aire es menor, así que el agua hierve a una temperatura más baja. En la cima del monte Everest hierve a solo unos 70 °C, ¡así que cocinar pasta tarda mucho más!' }
    ],
    sim: {
      predict: {
        q: 'Sigues calentando el agua. ¿A qué temperatura empezará a hervir?',
        choices: ['50 °C', '100 °C', '0 °C'],
        explain: 'Al nivel del mar, el agua hierve a 100 °C y se convierte en vapor. A 0 °C es donde se derrite el hielo.'
      }
    },
    quiz: [
      { q: '¿A qué temperatura se derrite el hielo?', choices: ['0 °C', '10 °C', '100 °C'], hint: 'Es la misma temperatura a la que el agua se congela.', explain: 'El hielo se derrite a 0 °C, la misma temperatura a la que el agua se congela.' },
      { q: '¿Cuál de estos es un líquido?', choices: ['Un bloque de madera', 'Jugo de naranja', 'El aire de un globo'], hint: '¿Cuál fluye y toma la forma de su vaso?', explain: 'El jugo de naranja es un líquido. La madera es un sólido, y el aire es un gas.' },
      { q: '¿Cómo se llama cuando un líquido se convierte en sólido?', choices: ['Derretirse', 'Hervir', 'Congelarse'], hint: 'Piensa en el agua en el congelador.', explain: 'Congelarse es cuando un líquido se convierte en sólido, como el agua que se vuelve hielo.' },
      { q: '¿Por qué el agua hierve por debajo de 100 °C en la cima de una montaña alta?', choices: ['Allí arriba hace más frío', 'La presión del aire es menor', 'El agua de montaña está más sucia'], hint: 'Piensa en el aire allá arriba.', explain: 'Allá arriba hay menos aire empujando sobre el agua, así que puede hervir a una temperatura más baja.' }
    ]
  },
  'p5-pendulums': {
    title: 'El vaivén constante',
    topicName: 'Péndulos',
    blurb: 'Cambia la cuerda y el peso. ¿Qué marca de verdad el ritmo de un balanceo?',
    reading: [
      { title: 'Un peso que se balancea', text: 'Un péndulo es un peso que cuelga de una cuerda o una varilla y se balancea de un lado a otro. El tiempo de un balanceo completo, de ida y vuelta, se llama periodo.' },
      { title: 'El secreto es la longitud', text: 'Una cuerda más larga da un balanceo más lento, con un periodo más largo; una cuerda más corta se balancea más rápido. Aunque te sorprenda, un peso más pesado NO cambia el periodo, y un balanceo suave tarda más o menos lo mismo que uno más amplio.' },
      { title: 'El descubrimiento de Galileo', text: 'Hacia el año 1600, el científico italiano Galileo Galilei estudió los péndulos. Descubrió que cada balanceo tarda el mismo tiempo, y que ese tiempo depende de la longitud de la cuerda.' },
      { title: 'Dónde lo ves', text: 'Su ritmo constante hizo de los péndulos el corazón de los relojes durante siglos, empezando por el reloj de Christiaan Huygens en 1656. El péndulo de un reloj de pie mide aproximadamente 1 metro, así que cada balanceo de un lado a otro tarda más o menos un segundo.' }
    ],
    sim: {
      predict: {
        q: 'Cambias el peso por otro el doble de pesado, con la misma cuerda. ¿Qué le pasa al tiempo de un balanceo?',
        choices: ['Se hace el doble de largo', 'Sigue igual', 'Se hace más corto'],
        explain: 'El periodo depende de la longitud de la cuerda, no de lo pesado que sea el peso. El peso más pesado se balancea exactamente con el mismo ritmo.'
      }
    },
    quiz: [
      { q: '¿Qué cambia el tiempo que tarda un péndulo en balancearse?', choices: ['La longitud de la cuerda', 'El color del peso', 'Lo pesado que es el peso'], hint: 'Recuerda qué pasó en el laboratorio cuando cambiabas cada cosa.', explain: 'Solo la longitud cambia el periodo. El peso y su color no influyen.' },
      { q: 'Haces la cuerda más corta. El péndulo se balanceará…', choices: ['más despacio', 'más rápido', 'exactamente igual'], hint: 'Piensa en un columpio bajito comparado con uno alto en el parque.', explain: 'Un péndulo más corto tiene un periodo más corto, así que va y viene más rápido.' },
      { q: '¿Qué es el periodo de un péndulo?', choices: ['Lo pesado que es el peso', 'La longitud de la cuerda', 'El tiempo de un balanceo completo, de ida y vuelta'], hint: 'Se mide en segundos.', explain: 'El periodo es el tiempo de un balanceo completo, de ida y vuelta.' },
      { q: 'Un reloj de péndulo va demasiado rápido. ¿Cómo podrías arreglarlo?', choices: ['Hacer el péndulo un poco más largo', 'Usar un peso más pesado', 'Hacer el péndulo más corto'], hint: '¿Qué cambio hace más lento el balanceo?', explain: 'Un péndulo más largo se balancea más despacio, así que el reloj hace tictac más despacio. Un peso más pesado no cambiaría nada.' }
    ]
  },
  'p5-reflection': {
    title: 'Espejito, espejito',
    topicName: 'La reflexión de la luz',
    blurb: 'Gira el espejo, apunta el rayo y da en el blanco.',
    reading: [
      { title: 'La luz rebota', text: 'Cuando la luz llega a una superficie lisa y brillante, como un espejo, rebota. Esto se llama reflexión. Ves tu cara porque la luz rebota desde ti hasta el espejo y de ahí a tus ojos.' },
      { title: 'Ángulo de entrada = ángulo de salida', text: 'Imagina una línea que sale recta del espejo, llamada la normal. El ángulo entre el rayo que llega y la normal (el ángulo de incidencia) siempre es igual al ángulo entre el rayo que sale y la normal (el ángulo de reflexión).' },
      { title: 'Liso y áspero', text: 'El papel también refleja la luz, pero su superficie es áspera, así que la luz se dispersa en todas direcciones. Por eso puedes ver una página, pero no ver tu cara en ella.' },
      { title: 'Dónde lo ves', text: 'Los retrovisores de los coches y los periscopios usan espejos para ver lo que hay tras las esquinas. Los astronautas del Apolo incluso dejaron espejos especiales en la Luna, y los científicos todavía hacen rebotar láseres en ellos para medir a qué distancia está la Luna.' }
    ],
    sim: {
      predict: {
        q: 'Un rayo de luz llega al espejo a 30° de la normal. ¿A qué ángulo de la normal rebotará?',
        choices: ['60°', '30°', '90°'],
        explain: 'El ángulo de reflexión siempre es igual al ángulo de incidencia: entra a 30° y sale a 30°.'
      }
    },
    quiz: [
      { q: '¿Cómo se llama la luz que rebota en una superficie?', choices: ['Refracción', 'Una sombra', 'Reflexión'], hint: 'La ves cuando te miras en un espejo.', explain: 'La reflexión es la luz que rebota en una superficie. (La refracción es la luz que se desvía al entrar en algo como el agua o el vidrio).' },
      { q: 'Un rayo llega a un espejo a 50° de la normal. ¿Cuál es el ángulo de reflexión?', choices: ['40°', '50°', '100°'], hint: 'El ángulo de entrada es igual al de salida.', explain: 'El ángulo de reflexión es igual al ángulo de incidencia, así que es 50°.' },
      { q: '¿Por qué no puedes ver tu cara en una hoja de papel?', choices: ['Su superficie áspera dispersa la luz en todas direcciones', 'El papel deja pasar toda la luz', 'El papel no refleja nada de luz'], hint: 'Puedes ver el papel, así que algo de luz tiene que rebotar en él.', explain: 'El papel sí refleja la luz, pero su superficie áspera la dispersa por todas partes, así que no se forma una imagen clara.' },
      { q: '¿Por qué brilla la Luna en el cielo de noche?', choices: ['Produce su propia luz', 'Refleja la luz del Sol', 'Está ardiendo como un fuego'], hint: 'La Luna no brilla por sí sola.', explain: 'La Luna no produce luz propia. Vemos la luz del Sol que rebota en su superficie.' }
    ]
  },
  'p6-air-resistance': {
    title: 'El martillo y la pluma',
    topicName: 'Gravedad y resistencia del aire',
    blurb: 'Un martillo y una pluma compiten por llegar al suelo. ¿Qué pasa si quitas el aire?',
    reading: [
      { title: 'La gravedad atrae todo', text: 'La gravedad atrae todos los objetos hacia el centro de la Tierra. Sin aire de por medio, todo objeto que cae acelera al mismo ritmo, unos 10 metros por segundo más rápido cada segundo, ya sea un martillo o una pluma.' },
      { title: 'La resistencia del aire', text: 'Un objeto que cae tiene que apartar el aire, y el aire lo empuja en contra. Esta fuerza se llama resistencia del aire, o arrastre. Crece cuanto más rápido vas, y cuenta sobre todo para las cosas anchas, ligeras y esponjosas. Por eso una pluma baja flotando mientras un martillo cae a plomo.' },
      { title: 'Velocidad terminal', text: 'Cuando alguien que se lanza en paracaídas acelera, la resistencia del aire crece hasta equilibrar su peso. Entonces deja de acelerar y cae a una velocidad máxima constante, llamada velocidad terminal. Un paracaídas añade muchísimo arrastre, así que esa velocidad constante se vuelve lenta y segura.' },
      { title: 'Dónde lo ves', text: 'En 1971, el astronauta David Scott, del Apolo 15, dejó caer un martillo y una pluma de halcón en la Luna, donde hay gravedad pero no hay aire. Tocaron el suelo en el mismo instante, tal como Galileo había predicho siglos antes.' }
    ],
    sim: {
      predict: {
        q: 'Se saca el aire con una bomba para hacer el vacío. Sueltas el martillo y la pluma a la vez. ¿Qué pasa?',
        choices: ['El martillo llega primero', 'Llegan al mismo tiempo', 'La pluma flota en el aire'],
        explain: 'Sin aire no hay resistencia del aire, así que la gravedad acelera a los dos al mismo ritmo y llegan juntos. Con el aire de vuelta, la pluma es mucho más lenta.'
      }
    },
    quiz: [
      { q: 'En el vacío (sin nada de aire), se sueltan a la vez una bola de bolos y una pluma. ¿Cuál llega primero?', choices: ['La bola de bolos', 'La pluma', 'Llegan juntas'], hint: 'Sin aire, ¿qué queda para frenar la pluma?', explain: 'Sin resistencia del aire, todos los objetos caen con la misma aceleración, así que llegan juntos, pesen lo que pesen.' },
      { q: '¿Por qué una pluma cae despacio en la Tierra?', choices: ['La gravedad no atrae las cosas muy ligeras', 'La resistencia del aire es grande comparada con su pequeño peso', 'El suelo aleja las plumas'], hint: 'La gravedad sí atrae la pluma. ¿Qué más actúa sobre ella?', explain: 'La gravedad tira de la pluma hacia abajo, pero su forma ancha y esponjosa recibe mucha resistencia del aire comparada con su pequeño peso.' },
      { q: 'Se sueltan a la vez en el aire dos hojas de papel iguales, una plana y otra arrugada. ¿Cuál llega primero?', choices: ['La hoja arrugada', 'La hoja plana', 'Llegan juntas porque pesan lo mismo'], hint: 'Pesan lo mismo, así que fíjate en su forma.', explain: 'Pesan lo mismo, pero la hoja arrugada tiene menos superficie para que el aire empuje, así que tiene menos resistencia del aire y cae más rápido.' },
      { q: '¿Qué hace un paracaídas?', choices: ['Hace más ligera a la persona que salta', 'Añade mucha resistencia del aire y frena la caída', 'Apaga la gravedad'], hint: 'Un paracaídas es grande y ancho.', explain: 'La enorme tela de un paracaídas aumenta muchísimo la resistencia del aire, así que la velocidad terminal de quien salta se vuelve lo bastante lenta para aterrizar sin peligro.' },
      { q: '¿Hay gravedad en la Luna?', choices: ['Sí, más o menos una sexta parte de la de la Tierra', 'No, allí no hay gravedad', 'Sí, igual de fuerte que en la Tierra'], hint: 'El martillo y la pluma sí cayeron al suelo en la Luna.', explain: 'La Luna tiene gravedad, pero es solo más o menos una sexta parte de la de la Tierra. Por eso los astronautas podían avanzar dando saltitos.' }
    ]
  },
  'p6-speed': {
    title: 'Preparados, listos, ¡velocidad!',
    topicName: 'Velocidad, distancia y tiempo',
    blurb: 'Haz competir a dos carritos y usa velocidad = distancia ÷ tiempo para encontrar al ganador.',
    reading: [
      { title: '¿Qué es la velocidad?', text: 'La velocidad te dice qué distancia recorre algo en un tiempo dado: velocidad = distancia ÷ tiempo. Si caminas 10 metros en 5 segundos, tu velocidad es 10 ÷ 5 = 2 metros por segundo, que se escribe 2 m/s.' },
      { title: 'Darle la vuelta a la fórmula', text: 'Distancia = velocidad × tiempo, así que un carrito que va a 3 m/s durante 4 segundos recorre 12 metros. Tiempo = distancia ÷ velocidad, así que 12 metros a 3 m/s tardan 4 segundos.' },
      { title: 'Las unidades importan', text: 'Los científicos usan metros por segundo (m/s). Las señales de tráfico usan kilómetros por hora (km/h) o millas por hora. 1 m/s son 3.6 km/h. Escribe siempre la unidad: ¡una velocidad de «5» podría ser la de un caracol o la de un cohete!' },
      { title: 'Dónde lo ves', text: 'En 2009, Usain Bolt corrió 100 metros en 9.58 segundos, a una media de unos 10.4 m/s. El sonido viaja por el aire a unos 340 m/s, ¡y la luz a la increíble velocidad de 300 000 kilómetros por segundo!' }
    ],
    sim: {
      predict: {
        q: 'El carrito A va a 2 m/s y el carrito B va a 4 m/s. Los dos corren durante 5 segundos. ¿Qué distancia recorre el carrito B?',
        choices: ['10 metros', '20 metros', '9 metros'],
        explain: 'Distancia = velocidad × tiempo = 4 m/s × 5 s = 20 metros. El carrito A solo recorre 2 × 5 = 10 metros.'
      }
    },
    quiz: [
      { q: 'Una bici recorre 60 metros en 10 segundos. ¿Cuál es su velocidad?', choices: ['6 m/s', '50 m/s', '600 m/s'], hint: 'Velocidad = distancia ÷ tiempo.', explain: '60 m ÷ 10 s = 6 m/s.' },
      { q: 'Un carrito va a 5 m/s durante 8 segundos. ¿Qué distancia recorre?', choices: ['13 metros', '40 metros', '3 metros'], hint: 'Distancia = velocidad × tiempo.', explain: '5 m/s × 8 s = 40 metros.' },
      { q: 'Una corredora recorre 100 metros a 5 m/s constantes. ¿Cuánto tarda?', choices: ['500 segundos', '95 segundos', '20 segundos'], hint: 'Tiempo = distancia ÷ velocidad.', explain: '100 m ÷ 5 m/s = 20 segundos.' },
      { q: '¿Quién es más rápido?', choices: ['Un ciclista que recorre 40 metros en 5 segundos', 'Un perro que corre 30 metros en 3 segundos', 'Son igual de rápidos'], hint: 'Calcula cada velocidad en m/s y luego compáralas.', explain: 'El perro: 30 ÷ 3 = 10 m/s. El ciclista: 40 ÷ 5 = 8 m/s. El perro es más rápido, aunque recorrió menos distancia.' }
    ]
  },
  'p7-orbits': {
    title: 'Caer alrededor del mundo',
    topicName: 'Gravedad y órbitas',
    blurb: 'Lanza una luna: muy lenta, se estrella; muy rápida, se escapa; a la velocidad justa, orbita.',
    reading: [
      { title: 'La gravedad sujeta a la Luna', text: 'Todo objeto con masa atrae a todos los demás objetos; esa atracción es la gravedad. La gravedad de la Tierra llega hasta la Luna, a unos 384 000 km, y tira de ella todo el tiempo.' },
      { title: 'La bala de cañón de Newton', text: 'Isaac Newton imaginó un cañón en lo alto de una montaña altísima. Si disparas una bala más rápido, cae más lejos. Si la disparas lo bastante rápido, la superficie de la Tierra se curva y se aleja tan rápido como cae la bala, así que sigue cayendo pero nunca llega al suelo. ¡Eso es una órbita!' },
      { title: 'Demasiado lento, demasiado rápido', text: 'Con muy poca velocidad hacia un lado, gana la gravedad y la luna cae y se estrella. A la velocidad justa da vueltas en círculo; un poco más rápido, el camino se estira en un óvalo llamado elipse. Si va lo bastante rápido, se escapa: desde la superficie de la Tierra, hacen falta unos 11 km por segundo.' },
      { title: 'Dónde lo ves', text: 'La Estación Espacial Internacional orbita a unos 400 km de altura a unos 28 000 km/h, y da la vuelta a la Tierra más o menos cada 90 minutos. Los astronautas flotan no porque no haya gravedad (allí arriba sigue teniendo cerca del 90% de su fuerza), sino porque ellos y la estación caen juntos alrededor de la Tierra.' }
    ],
    sim: {
      predict: {
        q: 'Lanzas la luna hacia un lado demasiado despacio. ¿Qué pasará?',
        choices: ['Cae y se estrella contra el planeta', 'Orbita en un círculo perfecto', 'Sale volando al espacio'],
        explain: 'Sin suficiente velocidad hacia un lado, la luna no puede «esquivar» el planeta mientras cae, así que la gravedad tira de ella hasta que se estrella.'
      }
    },
    quiz: [
      { q: '¿Qué mantiene a la Luna en órbita alrededor de la Tierra?', choices: ['El magnetismo entre ellas', 'La gravedad de la Tierra que tira de ella, junto con su velocidad hacia un lado', 'Nada, porque en el espacio no hay gravedad'], hint: 'Dos cosas trabajan juntas: una atracción y un movimiento.', explain: 'La gravedad atrae a la Luna hacia la Tierra mientras su velocidad hacia un lado la lleva hacia delante, así que sigue cayendo alrededor de la Tierra en vez de caer sobre ella.' },
      { q: '¿Por qué flotan los astronautas dentro de la Estación Espacial Internacional?', choices: ['Allí arriba no hay gravedad', 'Sus trajes espaciales están llenos de helio', 'Ellos y la estación caen juntos alrededor de la Tierra'], hint: 'En la estación, la gravedad sigue teniendo cerca del 90% de la fuerza que tiene en el suelo.', explain: 'Los astronautas y la estación caen juntos al mismo ritmo, así que nada los aprieta contra el suelo y flotan.' },
      { q: 'Se lanza una sonda espacial más rápido que la velocidad de escape. ¿Qué pasa?', choices: ['Se libera y se aleja por el espacio', 'Vuelve a caer al suelo', 'Da vueltas a la Tierra para siempre'], hint: 'Recuerda qué pasó en el laboratorio cuando lanzaste la luna muy rápido.', explain: 'Por encima de la velocidad de escape, la gravedad puede frenar la sonda pero nunca hacerla volver, así que deja atrás la Tierra.' },
      { q: 'La estación espacial está a unos 400 km de altura. ¿Cuánta fuerza tiene allí la gravedad de la Tierra, comparada con la del suelo?', choices: ['Ninguna', 'Cerca del 90%', 'El doble'], hint: '400 km es poco comparado con el radio de la Tierra, que mide unos 6400 km.', explain: 'La gravedad se debilita con la distancia, pero 400 km de altura no es tan lejos, así que sigue teniendo cerca del 90% de su fuerza. La estación está en órbita, no fuera del alcance de la gravedad.' }
    ]
  },
  'p7-energy': {
    title: 'Energía en vaivén',
    topicName: 'Energía potencial y cinética',
    blurb: 'Mira cómo un péndulo cambia energía almacenada por energía de movimiento, y al revés.',
    reading: [
      { title: 'Almacenada y en movimiento', text: 'Si levantas algo, gana energía potencial gravitatoria: energía almacenada por su altura. Si lo sueltas, esa energía almacenada se convierte en energía cinética, la energía del movimiento. La energía se mide en julios (J).' },
      { title: 'El intercambio del péndulo', text: 'En cada extremo de su balanceo, un péndulo se detiene un instante: toda su energía es potencial y nada es cinética. Abajo del todo se mueve lo más rápido, con la mayor energía cinética. Luego vuelve a subir y cambia otra vez la energía cinética por potencial.' },
      { title: 'Nunca se pierde, solo se reparte', text: 'La energía nunca se crea ni se destruye; solo cambia de forma. Un péndulo real se balancea cada vez más bajo porque la resistencia del aire y la fricción en el pivote convierten un poco de su energía en calor y sonido en cada balanceo.' },
      { title: 'Dónde lo ves', text: 'Una montaña rusa clásica sube arrastrada hasta su primera cuesta, almacenando energía potencial, y luego hace todo el recorrido solo con esa energía. Como la fricción y el aire convierten parte de ella en calor por el camino, cada cuesta siguiente tiene que ser más baja que la primera.' }
    ],
    sim: {
      predict: {
        q: '¿En qué punto de su balanceo se moverá más rápido el péndulo?',
        choices: ['En el punto más alto', 'Justo abajo del todo', 'A media subida de un lado'],
        explain: 'Abajo del todo, la mayor parte de la energía potencial se ha convertido en energía cinética, así que el peso se mueve más rápido ahí.'
      }
    },
    quiz: [
      { q: 'Sostienes una pelota quieta, muy por encima del suelo. ¿Qué tipo de energía tiene sobre todo?', choices: ['Energía potencial gravitatoria', 'Energía cinética', 'Energía sonora'], hint: 'Todavía no se mueve, pero podría caer.', explain: 'La pelota no se mueve, así que no tiene energía cinética, pero su altura le da energía almacenada: energía potencial gravitatoria.' },
      { q: 'Justo al final de su balanceo, la energía cinética de un péndulo es…', choices: ['la mayor de todas', 'cero, durante un instante', 'exactamente igual que abajo'], hint: '¿Se está moviendo el péndulo en ese momento exacto?', explain: 'Al final de cada balanceo, el péndulo se detiene un instante antes de volver, así que ahí su energía cinética es cero.' },
      { q: '¿Por qué un péndulo real se va parando poco a poco?', choices: ['Su energía se destruye', 'La gravedad se debilita con el tiempo', 'La fricción y la resistencia del aire convierten parte de su energía en calor'], hint: 'La energía no se puede destruir. Entonces, ¿adónde va?', explain: 'La energía no se destruye. La fricción y la resistencia del aire convierten un poco en calor (y sonido) en cada balanceo, así que queda menos para balancearse.' },
      { q: '¿Por qué las cuestas siguientes de una montaña rusa tienen que ser más bajas que la primera?', choices: ['Para que el tren vaya más despacio', 'El tren no puede ganar energía extra, y parte se convierte en calor', 'Porque las cuestas altas cuestan demasiado dinero'], hint: '¿De dónde viene la energía del tren, y adónde va parte de ella?', explain: 'Toda la energía del tren viene de que lo subieron por la primera cuesta. Parte se convierte en calor por la fricción y la resistencia del aire, así que nunca puede volver a subir tan alto.' }
    ]
  }
};
