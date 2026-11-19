/** Español — History lessons (overlay on content/history.js; text only). */
export default {
  // ───────────── Floor 1 ─────────────
  'h1-long-ago': {
    title: "Antes y ahora",
    topicName: "Antes y ahora",
    blurb: "Echa un vistazo a las casas, los juguetes y la escuela de hace mucho tiempo.",
    reading: [
      { title: "Hace mucho tiempo", text: "«Hace mucho tiempo» quiere decir antes de que nacieras. ¡Y también antes de que nacieran tus mayores! Entonces la vida era muy distinta." },
      { title: "Luz de noche", text: "Hace mucho tiempo, las casas no tenían luz eléctrica. La gente encendía velas y lámparas de aceite para ver de noche." },
      { title: "Juguetes", text: "Los niños y las niñas jugaban con trompos, canicas, muñecas de madera y aros. Muchos juguetes se hacían a mano en casa." },
      { title: "Cómo viajaban", text: "Hace mucho tiempo, la gente iba a pie o a caballo. Todavía no había autos ni aviones." }
    ],
    dialogue: {
      npc: { name: "Pip", role: "guía amable del museo" },
      intro: "¡Hola, viajero o viajera del tiempo! Soy Pip y cuido este museo. Todo lo que hay aquí es de hace mucho tiempo. ¿Qué te gustaría saber?",
      topics: [
        { ask: "¿Cómo veía la gente de noche?", answer: "Encendían velas y lámparas de aceite. La luz eléctrica empezó a iluminar las casas hace unos 140 años. ¡Antes de eso, las noches eran muy oscuras!" },
        { ask: "¿Con qué juguetes jugaban los niños y las niñas?", answer: "Con trompos, canicas, muñecas de madera y aros grandes que hacían rodar con un palo. ¡No necesitaban pilas!" },
        { ask: "¿Cómo era la escuela?", answer: "Muchos niños y niñas escribían con tiza en pizarritas, en vez de en papel. ¡Algunas escuelas tenían una sola aula para niños de todas las edades!" },
        { ask: "¿Cómo lavaba la gente la ropa?", answer: "¡A mano! Restregaban la ropa en una tabla de lavar llena de bultos, dentro de una tina con agua. Podía llevar un día entero. ¡Uf!" },
        { ask: "¿Cómo hablaba la gente con sus amigos lejanos?", answer: "Escribían cartas. Una carta podía tardar días o hasta semanas en llegar. ¡Ahora puedes hacer una videollamada en un segundo!" }
      ],
      challenge: {
        q: "Hace mucho tiempo, ¿qué usaba la gente para ver de noche?",
        choices: ["Linternas con pilas", "Velas y lámparas de aceite", "La pantalla de una tableta"],
        explain: "Antes de la luz eléctrica, la gente encendía velas y lámparas de aceite. Una llamita daba la luz justa para ver."
      },
      farewell: "¡Buen trabajo, viajero o viajera del tiempo! Las cosas antiguas nos cuentan historias. ¡Vuelve pronto!"
    },
    timeline: {
      title: "De hace mucho tiempo a hoy",
      events: [
        { label: "Los trenes de vapor empiezan a llevar pasajeros", when: "hacia 1830" },
        { label: "Las bombillas eléctricas empiezan a iluminar las casas", when: "hacia 1880" },
        { label: "Vuela el primer avión", when: "1903" },
        { label: "Unas personas caminan por la Luna", when: "1969" },
        { label: "Los teléfonos con pantalla táctil se vuelven populares", when: "hacia 2007" }
      ]
    },
    artifact: {
      name: "Una bombilla antigua",
      text: "Las primeras bombillas tenían un alambre finito dentro de una burbuja de vidrio. El alambre brillaba cuando la electricidad pasaba por él. ¡Luz sin llama!"
    },
    quiz: [
      {
        q: "Hace mucho tiempo, ¿en qué escribían muchos niños y niñas en la escuela?",
        choices: ["En una computadora portátil", "En una pizarrita, con tiza", "En una pizarra blanca"],
        hint: "Era pequeña, plana y oscura, como una pizarra en miniatura.",
        explain: "Escribían con tiza en pizarritas. Podían borrarlas y empezar otra vez."
      },
      {
        q: "Hace mucho tiempo, ¿cómo le mandaba noticias la gente a un amigo lejano?",
        choices: ["Escribían una carta", "Mandaban un mensaje de texto", "Hacían una videollamada"],
        hint: "Va dentro de un sobre con un sello.",
        explain: "La gente escribía cartas. Todavía no había teléfonos, así que las cartas llevaban las noticias."
      },
      {
        q: "¿Con qué juguete podía jugar un niño o una niña hace mucho tiempo?",
        choices: ["Un videojuego", "Un auto de control remoto", "Un trompo"],
        hint: "No necesita pilas ni pantalla.",
        explain: "Los trompos son juguetes muy antiguos. Los videojuegos y los autos de control remoto llegaron mucho después."
      },
      {
        q: "¿Cómo lavaba la gente la ropa hace mucho tiempo?",
        choices: ["A mano, en una tabla de lavar", "En una lavadora", "Con un robot"],
        hint: "La mayoría de las casas no tenía electricidad para enchufar aparatos.",
        explain: "La gente restregaba la ropa a mano en una tabla de lavar. ¡Era un trabajo duro!"
      },
      {
        q: "¿Qué forma de viajar es la más antigua?",
        choices: ["Los aviones", "Los autos", "Montar a caballo"],
        hint: "¡Este come heno!",
        explain: "La gente montó a caballo durante miles de años. Los autos y los aviones son nuevos en comparación."
      }
    ]
  },

  'h1-stone-age': {
    title: "La Edad de Piedra",
    topicName: "La Edad de Piedra",
    blurb: "Fabrica herramientas de piedra, siéntate junto al fuego y pinta en las paredes de una cueva.",
    reading: [
      { title: "Herramientas de piedra", text: "En la Edad de Piedra, la gente hacía herramientas de piedra. Golpeaban las rocas para sacarles bordes afilados y así poder cortar." },
      { title: "¡Fuego!", text: "El fuego mantenía caliente a la gente. Daba luz por la noche y servía para cocinar la comida." },
      { title: "Pinturas en las cuevas", text: "La gente pintaba animales en las paredes de las cuevas. Usaban tierra roja y amarilla, y carbón negro." },
      { title: "Buscar comida", text: "La gente cazaba animales y recogía bayas, nueces y raíces. Iban de un lugar a otro para encontrar comida." }
    ],
    dialogue: {
      npc: { name: "Tarn", role: "fabricante de herramientas de la Edad de Piedra" },
      intro: "¡Te doy la bienvenida a mi cueva! Soy Tarn. Hago herramientas de piedra. Siéntate junto al fuego y pregúntame lo que quieras.",
      topics: [
        { ask: "¿Cómo se hace una herramienta de piedra?", answer: "Golpeo una piedra con otra. ¡Toc, toc, toc! Saltan pedacitos y el borde se vuelve afilado. Hace falta mucha práctica." },
        { ask: "¿Para qué usas el fuego?", answer: "El fuego nos da calor y luz. ¡Y también cocina nuestra comida! ¡Ñam!" },
        { ask: "¿Por qué pintas en las paredes?", answer: "Pintamos los animales que vemos, como caballos y bisontes. Hoy nadie sabe con seguridad por qué los pintábamos. ¿Tú qué crees?" },
        { ask: "¿Qué comes?", answer: "Cazamos animales y recogemos bayas, nueces y raíces. No hay tiendas. ¡Ni una sola!" },
        { ask: "¿Vives con dinosaurios?", answer: "¡Para nada! Los dinosaurios desaparecieron millones de años antes de las primeras personas. ¡Es una confusión muy común!" }
      ],
      challenge: {
        q: "¿De qué hacían sus herramientas las personas de la Edad de Piedra?",
        choices: ["De plástico", "De metal", "De piedra"],
        explain: "¡Por eso se llama la Edad de Piedra! La gente golpeaba piedras para hacer herramientas afiladas."
      },
      farewell: "¡Tienes mucho talento para hacer herramientas! Abrígate bien ahí fuera."
    },
    timeline: {
      title: "La larga, larguísima Edad de Piedra",
      events: [
        { label: "Se hacen las primeras herramientas de piedra", when: "hace más de 2,5 millones de años" },
        { label: "La gente ya usa el fuego", when: "hace unos 400 000 años" },
        { label: "Se pintan animales en la cueva de Lascaux, en Francia", when: "hace unos 17 000 años" },
        { label: "La gente empieza a cultivar la tierra", when: "hace unos 11 000 años" },
        { label: "Se empieza a construir Stonehenge, en Inglaterra", when: "hace unos 5000 años" }
      ]
    },
    artifact: {
      name: "Un hacha de mano de piedra",
      text: "Esta piedra se golpeó por los dos lados para hacerle un borde afilado. ¡La gente usó hachas de mano como esta para cortar y picar durante más de un millón de años!"
    },
    quiz: [
      {
        q: "¿Con qué pintaban las cuevas las personas de la Edad de Piedra?",
        choices: ["Con tierra de colores y carbón", "Con marcadores", "Con pintura en aerosol"],
        hint: "No había tiendas. Los colores salían de la naturaleza.",
        explain: "Usaban tierra roja y amarilla, y carbón negro de madera quemada."
      },
      {
        q: "¿Por qué era tan útil el fuego?",
        choices: ["Cargaba los teléfonos", "Daba calor y luz, y cocinaba la comida", "Hacía que lloviera"],
        hint: "Piensa en una noche fría y oscura.",
        explain: "El fuego mantenía caliente a la gente, daba luz por la noche y cocinaba su comida."
      },
      {
        q: "¿Vivían con dinosaurios las personas de la Edad de Piedra?",
        choices: ["No, los dinosaurios desaparecieron mucho antes de que hubiera personas", "Sí, los tenían como mascotas"],
        hint: "Los dinosaurios vivieron hace muchísimo, muchísimo, ¡MUCHÍSIMO tiempo!",
        explain: "Los dinosaurios se extinguieron millones de años antes de que vivieran las primeras personas."
      },
      {
        q: "¿Cómo conseguían comida las personas de la Edad de Piedra?",
        choices: ["Iban al supermercado", "Pedían pizza", "Cazaban animales y recogían plantas"],
        hint: "Tenían que encontrarla por su cuenta, al aire libre.",
        explain: "Cazaban animales y recogían bayas, nueces y raíces."
      },
      {
        q: "¿Cómo se afilaba una herramienta de piedra?",
        choices: ["Derritiéndola en el fuego", "Golpeándola con otra piedra", "Dejándola bajo la lluvia"],
        hint: "¡Toc, toc, toc!",
        explain: "Al golpear una piedra con otra, saltan pedacitos y queda un borde afilado."
      }
    ]
  },

  'h1-castles': {
    title: "La vida en un castillo",
    topicName: "Castillos medievales",
    blurb: "Conoce a la cocinera del castillo y descubre cosas sobre caballeros, murallas y fosos.",
    reading: [
      { title: "Murallas fuertes", text: "Los castillos tenían murallas gruesas de piedra y torres altas. Se construían para proteger a la gente que vivía dentro." },
      { title: "El foso", text: "Muchos castillos tenían un foso. Un foso es una zanja profunda alrededor de las murallas. A menudo estaba lleno de agua." },
      { title: "Caballeros", text: "Los caballeros eran soldados que luchaban a caballo. Llevaban armadura y entrenaban durante años." },
      { title: "Un hogar con mucho movimiento", text: "Un castillo era como un pueblito. Cocineros, guardias, sirvientes y herreros vivían y trabajaban allí." }
    ],
    dialogue: {
      npc: { name: "Marta", role: "la cocinera del castillo" },
      intro: "¡Hola! Soy Marta, la cocinera del castillo. ¡Cuidado con las ollas calientes! ¿Qué quieres saber sobre la vida en el castillo?",
      topics: [
        { ask: "¿Qué cocinas?", answer: "Pan, sopas y guisos todos los días. ¡Para un gran banquete, a lo mejor asamos un cerdo entero!" },
        { ask: "¿Cómo cruza la gente el foso?", answer: "¡Por el puente levadizo! Se puede subir con cadenas, para que los enemigos no puedan pasar." },
        { ask: "¿De quién es el castillo?", answer: "Del señor y la señora. Gobiernan las tierras que rodean el castillo, y aquí todos trabajamos para ellos." },
        { ask: "¿Cómo aprenden los caballeros a ser caballeros?", answer: "¡Empiezan de pequeños! Un niño podía empezar como paje hacia los siete años. Aprende a montar a caballo, a luchar con espada y a tener buenos modales." },
        { ask: "¿Es acogedor el castillo?", answer: "¡No mucho! Las paredes de piedra son frías y las ventanas son pequeñas. Nos calentamos con grandes fuegos y colgamos telas gruesas en las paredes." }
      ],
      challenge: {
        q: "¿Qué es un foso?",
        choices: ["Una torre alta", "Una zanja profunda alrededor del castillo", "Un tipo de armadura"],
        explain: "Un foso es una zanja profunda alrededor de las murallas, a menudo llena de agua. Hacía que el castillo fuera difícil de atacar."
      },
      farewell: "¡Hasta luego, y que el puente levadizo no te atrape los dedos de los pies! Vuelve otro día por un bollito."
    },
    timeline: {
      title: "Los castillos a lo largo del tiempo",
      events: [
        { label: "En Inglaterra se construyen castillos rápidos de madera sobre montículos de tierra", when: "hacia 1070" },
        { label: "Por toda Europa se construyen grandes castillos de piedra con torres altas", when: "hacia 1200" },
        { label: "Los cañones ya pueden derribar las murallas de los castillos", when: "hacia 1450" },
        { label: "En Alemania se empieza a construir Neuschwanstein, un castillo de cuento de hadas", when: "1869" },
        { label: "Las familias visitan castillos antiguos convertidos en museos", when: "hoy" }
      ]
    },
    artifact: {
      name: "Una maqueta de castillo",
      text: "Busca las torres, las murallas gruesas y el foso. La puerta era el punto más débil, así que tenía un puente levadizo y una pesada reja que subía y bajaba, llamada rastrillo."
    },
    quiz: [
      {
        q: "¿Para qué servía el puente levadizo?",
        choices: ["Para cruzar el foso", "Para hornear pan", "Para subir a la torre"],
        hint: "Pasa por encima del agua.",
        explain: "El puente levadizo permitía cruzar el foso. Se podía subir para que no entraran los enemigos."
      },
      {
        q: "¿Quiénes luchaban a caballo y con armadura?",
        choices: ["Los cocineros", "Los caballeros", "Los panaderos"],
        hint: "Entrenaban durante años con espadas.",
        explain: "Los caballeros eran soldados que luchaban a caballo y llevaban armadura."
      },
      {
        q: "¿Por qué los castillos tenían murallas tan gruesas?",
        choices: ["Para colgar más cuadros", "Para que el castillo oliera bien", "Para proteger a la gente que vivía dentro"],
        hint: "Piensa en enemigos que intentan entrar.",
        explain: "Las murallas gruesas de piedra eran difíciles de romper, así que protegían a la gente de dentro."
      },
      {
        q: "¿Cómo se calentaba la gente en un castillo frío?",
        choices: ["Con calefacción central", "Con grandes fuegos y telas gruesas en las paredes", "Con mantas eléctricas"],
        hint: "Hace mucho tiempo no había electricidad.",
        explain: "Los castillos tenían grandes chimeneas, y los tapices gruesos ayudaban a que no entrara el frío."
      },
      {
        q: "¿De quién era el castillo?",
        choices: ["De la cocinera", "De los caballos", "Del señor y la señora"],
        hint: "Todos en el castillo trabajaban para ellos.",
        explain: "El señor y la señora eran los dueños del castillo y gobernaban las tierras de alrededor."
      }
    ]
  },

  // ───────────── Floor 2 ─────────────
  'h2-pyramids': {
    title: "La Gran Pirámide",
    topicName: "El antiguo Egipto",
    blurb: "Ayuda a construir la Gran Pirámide de Guiza, en el antiguo Egipto.",
    reading: [
      { title: "Tumbas para reyes", text: "Las pirámides eran tumbas gigantes para los reyes de Egipto, llamados faraones. La Gran Pirámide de Guiza se construyó para el rey Keops." },
      { title: "Piedras enormes", text: "La Gran Pirámide tiene más de dos millones de bloques de piedra. ¡Muchos pesan más que un auto!" },
      { title: "¿Quién las construyó?", text: "Miles de trabajadores expertos construyeron las pirámides. Los arqueólogos encontraron su aldea, sus panaderías y sus tumbas. Hoy la mayoría de los expertos piensa que eran trabajadores con paga, no esclavos." },
      { title: "El río Nilo", text: "Egipto es casi todo desierto. El río Nilo daba agua para los cultivos, y los barcos llevaban piedras por él." }
    ],
    dialogue: {
      npc: { name: "Meri", role: "tallista de piedra en Guiza" },
      intro: "¡Hola! Soy Meri. Tallo piedra para la gran pirámide del rey, aquí en Guiza. ¡Cuidado con el polvo!",
      topics: [
        { ask: "¿Para quién es la pirámide?", answer: "Es una tumba para el rey Keops, nuestro faraón. Creemos que un rey necesita un lugar seguro donde descansar para la vida que viene después de esta." },
        { ask: "¿Cómo mueven piedras tan grandes?", answer: "Varios equipos las arrastran sobre trineos de madera. Echamos agua en la arena para que los trineos se deslicen mejor. Los barcos también traen piedra por el Nilo." },
        { ask: "¿Eres esclavo o esclava?", answer: "¡No! Hoy la mayoría de los arqueólogos piensa que los trabajadores como yo recibían una paga, muchas veces en comida, como pan. Vivimos en una aldea cercana y estamos orgullosos de nuestro trabajo." },
        { ask: "¿Cuánto se tarda en construirla?", answer: "Los expertos creen que la Gran Pirámide llevó unos 20 años. Los equipos de trabajadores se turnan." },
        { ask: "¿Qué es una momia?", answer: "Un cuerpo que se secaba con mucho cuidado y se envolvía en tela de lino. Los egipcios lo hacían porque creían que la persona seguiría viviendo en el más allá." }
      ],
      challenge: {
        q: "Según la mayoría de los arqueólogos de hoy, ¿quién construyó las pirámides?",
        choices: ["Esclavos encadenados", "Visitantes del espacio", "Trabajadores expertos y con paga"],
        explain: "Los arqueólogos encontraron la aldea, las panaderías y las tumbas de los trabajadores. Esto muestra que eran trabajadores expertos que recibían comida y una paga."
      },
      farewell: "¡Gracias por visitar Guiza! Que tu camino sea tan recto como el borde de una pirámide."
    },
    timeline: {
      title: "El antiguo Egipto",
      events: [
        { label: "El Alto y el Bajo Egipto se unen en un solo reino", when: "hacia 3100 a. C." },
        { label: "Se construye la pirámide escalonada del rey Zoser", when: "hacia 2650 a. C." },
        { label: "Se termina la Gran Pirámide de Guiza", when: "hacia 2560 a. C." },
        { label: "Tutankamón se convierte en faraón cuando es un niño", when: "hacia 1332 a. C." },
        { label: "Muere Cleopatra, la última reina del antiguo Egipto", when: "30 a. C." }
      ]
    },
    artifact: {
      name: "La Gran Pirámide",
      text: "Cuando era nueva, medía unos 146 metros de alto y estaba cubierta de piedra caliza blanca y lisa. ¡Fue el edificio más alto hecho por personas durante unos 3800 años!"
    },
    quiz: [
      {
        q: "¿Para quién se construyó la Gran Pirámide?",
        choices: ["Para el rey Keops", "Para Cleopatra", "Para Tutankamón"],
        hint: "Su nombre empieza por la letra K.",
        explain: "La Gran Pirámide se construyó como tumba para el rey Keops. Cleopatra y Tutankamón vivieron mucho después."
      },
      {
        q: "¿Qué río ayudó a Egipto a cultivar alimentos y a mover piedras?",
        choices: ["El Amazonas", "El Nilo", "El Támesis"],
        hint: "Es el río que atraviesa Egipto de punta a punta.",
        explain: "El Nilo daba agua para los cultivos en el desierto, y los barcos llevaban piedras por él."
      },
      {
        q: "¿Cómo movían los trabajadores las piedras pesadas por la arena?",
        choices: ["Con camiones", "Con globos aerostáticos", "Sobre trineos de madera"],
        hint: "Echar agua en la arena ayudaba a que se deslizaran.",
        explain: "Los equipos arrastraban las piedras sobre trineos de madera. La arena mojada hacía que los trineos se deslizaran mejor."
      },
      {
        q: "¿Qué es un faraón?",
        choices: ["Un tipo de barco", "Un rey del antiguo Egipto", "La puerta de una pirámide"],
        hint: "Keops y Tutankamón lo fueron.",
        explain: "Un faraón era un rey del antiguo Egipto."
      },
      {
        q: "¿Por qué los egipcios hacían momias?",
        choices: ["Creían que eso ayudaba a la persona en el más allá", "Para asustar a los ladrones", "Para que el cuerpo no pasara frío"],
        hint: "Piensa en lo que creían los egipcios sobre lo que pasa después de la vida.",
        explain: "Los egipcios creían que las personas seguían viviendo después de la muerte, así que cuidaban el cuerpo con mucho esmero."
      }
    ]
  },

  'h2-first-writing': {
    title: "La primera escritura",
    topicName: "Mesopotamia",
    blurb: "Escribe en arcilla como los escribas de Mesopotamia.",
    reading: [
      { title: "La tierra entre ríos", text: "Mesopotamia quiere decir «la tierra entre los ríos». Sus dos ríos son el Tigris y el Éufrates. Hoy, la mayor parte está en Irak." },
      { title: "Escribir en arcilla", text: "Hace más de 5000 años, la gente de aquí empezó a escribir. Apretaban una caña puntiaguda sobre arcilla blanda y húmeda." },
      { title: "Marcas en forma de cuña", text: "Las marcas parecen cuñas pequeñitas. A esta escritura la llamamos cuneiforme. Quiere decir «en forma de cuña»." },
      { title: "Vueltas y vueltas", text: "La gente de aquí fue de las primeras en usar ruedas. Los alfareros usaban ruedas para dar forma a las vasijas de arcilla. ¡Más tarde, las ruedas se pusieron en carros!" }
    ],
    dialogue: {
      npc: { name: "Ubar", role: "escriba de la ciudad de Uruk" },
      intro: "¡Saludos! Soy Ubar, escriba de la gran ciudad de Uruk. Me paso el día escribiendo en arcilla. ¿Quieres verlo?",
      topics: [
        { ask: "¿Por qué la gente empezó a escribir?", answer: "¡Para llevar la cuenta de las cosas! La primera escritura servía para contar ovejas y grano. Más tarde, la gente también escribió leyes, cartas e historias." },
        { ask: "¿Con qué escribes?", answer: "Con un punzón. Es una caña puntiaguda. La aprieto sobre la arcilla blanda, y luego la tablilla se seca y se pone dura." },
        { ask: "¿Es fácil aprender a escribir?", answer: "¡Para nada! Hay cientos de signos que aprender. Los escribas van a la escuela durante años y hacen montones de tablillas de práctica." },
        { ask: "¿Aquí se inventó la rueda?", answer: "La gente de aquí fue de las primeras en usar ruedas. Los alfareros las usaban para hacer vasijas. Luego, a alguien se le ocurrió poner ruedas a un carro. ¡Qué buena idea!" },
        { ask: "¿Cuál es la historia más antigua?", answer: "Una de las más antiguas trata de Gilgamesh, un rey de Uruk. Está llena de aventuras, monstruos y amistad." }
      ],
      challenge: {
        q: "¿Sobre qué escribían los escribas de Mesopotamia?",
        choices: ["Tablillas de arcilla", "Papel", "Plástico"],
        explain: "Los escribas apretaban una caña sobre tablillas de arcilla blanda. Todavía no se había inventado el papel."
      },
      farewell: "¡Que tu letra sea siempre bonita! Al salir, no pises mis tablillas húmedas."
    },
    timeline: {
      title: "Primeras veces en Mesopotamia",
      events: [
        { label: "Empieza la agricultura en el Creciente Fértil, cerca de Mesopotamia", when: "hacia 9000 a. C." },
        { label: "Aparecen los carros con ruedas", when: "hacia 3500 a. C." },
        { label: "Empieza la escritura en la ciudad de Uruk", when: "hacia 3200 a. C." },
        { label: "El rey Hammurabi pone sus leyes por escrito", when: "hacia 1754 a. C." },
        { label: "Persia conquista la ciudad de Babilonia", when: "539 a. C." }
      ]
    },
    artifact: {
      name: "Una tablilla de arcilla",
      text: "Esta tablilla cabe en tu mano. Sus marcas en forma de cuña se hicieron apretando una caña. Muchas tablillas eran listas, ¡como una lista de la compra! Todavía se conservan cientos de miles."
    },
    quiz: [
      {
        q: "¿Qué quiere decir «cuneiforme»?",
        choices: ["Redondo y liso", "En forma de cuña", "Muy antiguo"],
        hint: "Fíjate en la forma de las marquitas.",
        explain: "Cuneiforme quiere decir «en forma de cuña», porque las marcas parecen cuñas diminutas."
      },
      {
        q: "¿Por qué empezó la primera escritura?",
        choices: ["Para mandar correos electrónicos", "Para escribir las reglas de los juegos", "Para contar cosas como grano y ovejas"],
        hint: "Piensa en alguien de una granja que apunta sus cosas en una lista.",
        explain: "La primera escritura se usaba para llevar la cuenta de cosas como el grano y las ovejas."
      },
      {
        q: "¿Para qué se usaron algunas de las primeras ruedas?",
        choices: ["Para hacer vasijas de arcilla", "Para bicicletas", "Para relojes"],
        hint: "¡Los escribas escribían sobre el mismo material!",
        explain: "Los alfareros usaban ruedas que giraban para dar forma a las vasijas de arcilla. Las ruedas en los carros llegaron después."
      },
      {
        q: "¿Qué dos ríos atraviesan Mesopotamia?",
        choices: ["El Nilo y el Amazonas", "El Tigris y el Éufrates", "El Támesis y el Sena"],
        hint: "Uno empieza por T y el otro por E.",
        explain: "Mesopotamia está entre los ríos Tigris y Éufrates."
      },
      {
        q: "¿Cómo se endurecía una tablilla de arcilla blanda?",
        choices: ["Se secaba al sol o se cocía en el fuego", "Se congelaba en hielo", "Se cubría de pegamento"],
        hint: "Piensa en el barro en un día de mucho sol y calor.",
        explain: "La arcilla se endurece al secarse al sol. Si se cuece en el fuego, queda todavía más dura."
      }
    ]
  },

  'h2-vikings': {
    title: "Los vikingos",
    topicName: "Los vikingos",
    blurb: "Navega en un barco largo y desmiente un famoso mito vikingo.",
    reading: [
      { title: "¿Quiénes eran los vikingos?", text: "Los vikingos venían de Escandinavia. Hoy allí están Noruega, Suecia y Dinamarca. Vivieron hace más de 1000 años." },
      { title: "Ante todo, granjeros", text: "La mayoría de los vikingos eran granjeros. Cultivaban cebada y avena, y criaban vacas, ovejas y cerdos." },
      { title: "Barcos largos", text: "Los barcos largos vikingos eran rápidos y ligeros. Podían cruzar el mar y subir remando por ríos poco profundos." },
      { title: "¡Sin cuernos!", text: "¿Llevaban los vikingos cascos con cuernos? ¡No! Esa idea salió de unos disfraces de hace unos 150 años. Los cascos vikingos de verdad eran sencillos y redondos." }
    ],
    dialogue: {
      npc: { name: "Astrid", role: "granjera y marinera vikinga" },
      intro: "¡Hei! Soy Astrid. Tengo una granja junto al fiordo, y en verano salgo a navegar. ¡Pregúntame lo que quieras!",
      topics: [
        { ask: "¿Los vikingos llevan cascos con cuernos?", answer: "¡Ja! No. Los cuernos estorbarían. Esa idea salió de los disfraces de ópera del siglo XIX, mucho después de los vikingos." },
        { ask: "¿Cómo es un barco largo?", answer: "¡Largo, estrecho y rápido! Tiene una gran vela cuadrada y remos. Es tan ligero que podemos subir los ríos remando." },
        { ask: "¿Adónde van los vikingos?", answer: "¡Muy lejos! Hace unos 1000 años, los vikingos llegaron a Islandia, a Groenlandia y hasta a América del Norte. Algunos también viajaron hacia el este por los ríos." },
        { ask: "¿Todos los vikingos son saqueadores?", answer: "No. Algunos sí asaltaban pueblos y monasterios, y eso daba mucho miedo a la gente de allí. Pero la mayoría de los vikingos eran granjeros, comerciantes y artesanos." },
        { ask: "¿Los vikingos saben escribir?", answer: "¡Sí, con runas! Las runas son letras hechas de líneas rectas. Son fáciles de tallar en madera o en piedra." }
      ],
      challenge: {
        q: "¿Llevaban los vikingos cascos con cuernos?",
        choices: ["Sí, siempre", "No, es un mito", "Solo los domingos"],
        explain: "¡Es un mito! Los cascos con cuernos salieron de disfraces del siglo XIX. Los cascos vikingos de verdad eran sencillos y redondos."
      },
      farewell: "¡Buen viaje! Que el viento llene tu vela."
    },
    timeline: {
      title: "La era vikinga",
      events: [
        { label: "Los vikingos asaltan el monasterio de Lindisfarne, en Inglaterra", when: "793" },
        { label: "Los vikingos se instalan en Islandia", when: "hacia 870" },
        { label: "Erik el Rojo funda un asentamiento en Groenlandia", when: "hacia 985" },
        { label: "La tripulación de Leif Erikson llega a América del Norte", when: "hacia 1000" },
        { label: "Un rey vikingo pierde la batalla de Stamford Bridge", when: "1066" }
      ]
    },
    artifact: {
      name: "Un barco largo vikingo",
      text: "Los barcos largos tenían la proa y la popa altas y curvadas, una vela cuadrada de lana y remos a los lados. ¡El barco de Oseberg, encontrado en Noruega, tiene más de 1100 años!"
    },
    quiz: [
      {
        q: "¿De dónde venían los vikingos?",
        choices: ["De Escandinavia", "De Egipto", "De China"],
        hint: "Piensa en Noruega, Suecia y Dinamarca.",
        explain: "Los vikingos venían de Escandinavia: la actual Noruega, Suecia y Dinamarca."
      },
      {
        q: "¿A qué se dedicaban la mayoría de los vikingos?",
        choices: ["A jugar al fútbol", "A trabajar en el campo", "A construir pirámides"],
        hint: "¡Cebada, avena, vacas y ovejas!",
        explain: "La mayoría de los vikingos eran granjeros. Cultivaban la tierra y criaban animales."
      },
      {
        q: "¿Por qué los barcos largos podían subir por los ríos?",
        choices: ["Tenían ruedas", "Podían volar", "Eran ligeros y no se hundían mucho en el agua"],
        hint: "Los ríos pueden ser poco profundos.",
        explain: "Los barcos largos eran ligeros y flotaban muy altos, así que podían subir remando por ríos poco profundos."
      },
      {
        q: "¿Qué son las runas?",
        choices: ["Barcos vikingos", "Letras vikingas para escribir", "Zapatos vikingos"],
        hint: "Los vikingos las tallaban en piedras.",
        explain: "Las runas son letras vikingas hechas de líneas rectas, fáciles de tallar en madera o en piedra."
      },
      {
        q: "¿A qué tierra lejana llegaron los vikingos hace unos 1000 años?",
        choices: ["A América del Norte", "A la Antártida", "A la Luna"],
        hint: "Navegaron hacia el oeste, más allá de Groenlandia.",
        explain: "La tripulación de Leif Erikson navegó más allá de Groenlandia y llegó a América del Norte."
      }
    ]
  },

  // ───────────── Floor 3 ─────────────
  'h3-ancient-greece': {
    title: "La antigua Grecia",
    topicName: "La antigua Grecia",
    blurb: "Entrena para los primeros Juegos Olímpicos y descubre cómo votaba Atenas.",
    reading: [
      { title: "Ciudades-estado", text: "La antigua Grecia no era un solo país. Eran muchas ciudades-estado, como Atenas y Esparta, cada una con sus propios gobernantes y su propio ejército. Compartían una lengua, sus dioses y los Juegos Olímpicos." },
      { title: "Los Juegos Olímpicos", text: "Los primeros Juegos Olímpicos de los que hay registro se celebraron en Olimpia en el año 776 a. C., en honor del dios Zeus. Los ganadores no recibían medallas: recibían una corona de hojas de olivo." },
      { title: "El poder del pueblo", text: "Hacia el año 508 a. C., Atenas empezó la democracia, que significa «gobierno del pueblo». Los ciudadanos votaban las grandes decisiones. Pero solo los hombres libres contaban como ciudadanos. Las mujeres y las personas esclavizadas no podían votar." },
      { title: "Columnas", text: "A los constructores griegos les encantaban las columnas altas de piedra. El Partenón de Atenas, terminado en el 432 a. C., todavía inspira bancos, museos y edificios de gobierno de todo el mundo." }
    ],
    dialogue: {
      npc: { name: "Terón", role: "atleta que se entrena para los Juegos Olímpicos" },
      intro: "¡Jaire! Así se dice «hola» en griego. Soy Terón y me estoy entrenando para los Juegos Olímpicos. ¡Camina conmigo mientras caliento!",
      topics: [
        { ask: "¿Cuáles son las pruebas olímpicas?", answer: "Carreras a pie, lucha, boxeo y carreras de carros. También está el pentatlón: cinco pruebas en una, entre ellas el lanzamiento de disco, el de jabalina y el salto de longitud." },
        { ask: "¿Quién puede participar?", answer: "Solo los hombres y los muchachos griegos libres. ¡A las mujeres casadas ni siquiera las dejaban mirar! Las chicas tenían sus propias carreras en Olimpia, llamadas Juegos Hereos." },
        { ask: "¿Cómo se vota en Atenas?", answer: "Los ciudadanos se reúnen en una colina llamada Pnix y votan, muchas veces levantando la mano. Miles de ellos deciden grandes cuestiones, incluso si ir a la guerra." },
        { ask: "¿Qué tipos de columnas hay?", answer: "Tres estilos principales: la dórica es sencilla, la jónica tiene volutas enrolladas arriba y la corintia está tallada con hojas. Todavía puedes encontrar las tres en edificios de hoy." },
        { ask: "¿Qué le dieron los griegos al mundo?", answer: "¡Muchas cosas! La democracia, el teatro, los Juegos Olímpicos y pensadores como Sócrates y Aristóteles, que se hacían grandes preguntas sobre cómo vivir." }
      ],
      challenge: {
        q: "¿Qué recibía un ganador de los antiguos Juegos en Olimpia?",
        choices: ["Una medalla de oro", "Un trofeo de plata", "Una corona de hojas de olivo"],
        explain: "En Olimpia, a los ganadores los coronaban con una corona de hojas de olivo. Las medallas de oro llegaron con los Juegos Olímpicos modernos."
      },
      farewell: "¡Me voy a entrenar! Que tus pies sean siempre veloces."
    },
    timeline: {
      title: "La antigua Grecia",
      events: [
        { label: "Primeros Juegos Olímpicos registrados, en Olimpia", when: "776 a. C." },
        { label: "Atenas empieza su democracia", when: "hacia 508 a. C." },
        { label: "Se termina el Partenón de Atenas", when: "432 a. C." },
        { label: "Alejandro Magno se convierte en rey de Macedonia", when: "336 a. C." },
        { label: "Empiezan los Juegos Olímpicos modernos, en Atenas", when: "1896" }
      ]
    },
    artifact: {
      name: "Una columna griega",
      text: "Las columnas griegas tenían tres estilos principales: la dórica, sencilla; la jónica, con volutas enrolladas, y la corintia, con hojas. Muchas son un poco más gruesas en el medio: un truco de los constructores para que, vistas de lejos, parezcan rectas y fuertes."
    },
    quiz: [
      {
        q: "¿Dónde se celebraban los antiguos Juegos Olímpicos?",
        choices: ["En Atenas", "En Olimpia", "En Roma"],
        hint: "El lugar se parece mucho al nombre de los Juegos.",
        explain: "Los Juegos antiguos se celebraban en Olimpia, un lugar sagrado del dios Zeus."
      },
      {
        q: "¿Qué significa «democracia»?",
        choices: ["Gobierno del pueblo", "Gobierno de un solo rey", "Gobierno del ejército"],
        hint: "En Atenas, los ciudadanos levantaban la mano para votar.",
        explain: "Democracia significa «gobierno del pueblo»: los ciudadanos votan para tomar decisiones."
      },
      {
        q: "¿Quién podía votar en la antigua Atenas?",
        choices: ["Todo el mundo, incluso los niños", "Solo las mujeres", "Solo los hombres libres que eran ciudadanos"],
        hint: "La democracia de Atenas dejaba fuera a mucha gente.",
        explain: "Solo los hombres libres que eran ciudadanos podían votar. Las mujeres, las personas esclavizadas y los extranjeros no podían."
      },
      {
        q: "¿Qué estilo de columna tiene volutas enrolladas arriba?",
        choices: ["Dórico", "Jónico", "Corintio"],
        hint: "No es el sencillo, ni el de hojas.",
        explain: "Las columnas jónicas tienen volutas arriba. Las dóricas son sencillas; las corintias tienen hojas talladas."
      }
    ]
  },

  'h3-roman-engineers': {
    title: "Ingenieros romanos",
    topicName: "La antigua Roma",
    blurb: "Construye calzadas, arcos y acueductos con un ingeniero del ejército romano.",
    reading: [
      { title: "Todos los caminos llevan a Roma", text: "Los romanos construyeron más de 80 000 kilómetros de calzadas pavimentadas por todo su imperio. Las calzadas rectas permitían que los ejércitos, los comerciantes y los mensajes viajaran rápido, y algunas todavía se usan hoy." },
      { title: "Agua en movimiento", text: "Los acueductos llevaban agua fresca desde las colinas hasta las ciudades, siempre con una suave bajada. La mayor parte de su recorrido iba bajo tierra. Los famosos puentes de arcos los llevaban por encima de los valles." },
      { title: "El poderoso arco", text: "Un arco reparte el peso que tiene encima hacia los lados y hacia abajo, hasta el suelo. Eso permitió a los romanos construir puentes fuertes y edificios enormes como el Coliseo." },
      { title: "El concreto romano", text: "Los romanos mezclaban cal con ceniza volcánica para hacer un concreto que podía endurecerse incluso bajo el agua. La cúpula del Panteón de Roma tiene unos 1900 años y sigue en pie." }
    ],
    dialogue: {
      npc: { name: "Gayo", role: "ingeniero del ejército romano" },
      intro: "¡Salve! Soy Gayo, ingeniero del ejército romano. Hoy construimos una calzada nueva. ¡Agarra una pala y pregunta lo que quieras!",
      topics: [
        { ask: "¿Cómo se construye una calzada?", answer: "Primero cavamos una zanja. Luego la llenamos por capas: piedras grandes, después grava y, encima, losas que encajan bien. El centro queda un poco más alto, para que la lluvia escurra hacia las cunetas." },
        { ask: "¿Por qué tus calzadas son tan rectas?", answer: "¡Lo recto es lo más corto! Usamos una herramienta llamada groma para marcar líneas rectas. Calzadas más rápidas significan ejércitos más rápidos y noticias más rápidas." },
        { ask: "¿Cómo funciona un acueducto?", answer: "La gravedad hace el trabajo. Hacemos que el canal baje solo un poquito a lo largo de muchos kilómetros, y así el agua corre sola hasta las fuentes y los baños de la ciudad." },
        { ask: "¿Qué tiene de especial el concreto romano?", answer: "Mezclamos cal, ceniza volcánica, agua y trozos de roca. Se endurece mucho, incluso bajo el agua, así que lo usamos tanto para puertos como para cúpulas." },
        { ask: "¿Para qué sirven los arcos?", answer: "Un arco empuja el peso hacia fuera y hacia abajo, así que la piedra puede cruzar un hueco ancho sin agrietarse. ¡Pon varios arcos en fila y tendrás un puente o un acueducto!" }
      ],
      challenge: {
        q: "¿Qué hace que el agua corra por un acueducto?",
        choices: ["La gravedad, con una suave pendiente hacia abajo", "Bombas eléctricas", "El viento"],
        explain: "Los acueductos bajan con una pendiente muy suave, así que la gravedad arrastra el agua. Las bombas eléctricas todavía no existían."
      },
      farewell: "¡Vale! Eso significa «adiós». Recuerda: constrúyelo recto, constrúyelo fuerte."
    },
    timeline: {
      title: "Roma construye a lo grande",
      events: [
        { label: "Empiezan las obras de la Vía Apia, una gran calzada romana", when: "312 a. C." },
        { label: "El ejército de Julio César tiende un puente sobre el río Rin en unos diez días", when: "55 a. C." },
        { label: "Se inaugura el Coliseo en Roma", when: "80 d. C." },
        { label: "Se termina la gigantesca cúpula de concreto del Panteón", when: "hacia 125 d. C." },
        { label: "Llega el fin del Imperio romano de Occidente", when: "476 d. C." }
      ]
    },
    artifact: {
      name: "Un arco romano",
      text: "La piedra en forma de cuña que está justo arriba del todo es la piedra clave. Sujeta las demás piedras en su sitio, así que, cuando el arco está terminado, se puede quitar la estructura de madera que se usó para construirlo."
    },
    quiz: [
      {
        q: "¿Qué hace un arco con el peso que tiene encima?",
        choices: ["Lo aprieta todo en la piedra clave", "Lo reparte hacia los lados y hacia abajo, hasta el suelo", "Hace que las piedras floten"],
        hint: "Imagina el peso viajando a lo largo de la curva.",
        explain: "Un arco reparte el peso hacia los lados y hacia abajo, hasta el suelo, así que las piedras se aprietan entre sí en vez de caerse."
      },
      {
        q: "¿Qué ingrediente ayudaba al concreto romano a endurecerse incluso bajo el agua?",
        choices: ["Ceniza volcánica", "Azúcar", "Conchas marinas"],
        hint: "Italia tiene volcanes, como el Vesubio.",
        explain: "La ceniza volcánica mezclada con cal daba un concreto que podía endurecerse incluso en el agua del mar."
      },
      {
        q: "¿Por qué las calzadas romanas eran un poco más altas en el centro?",
        choices: ["Para que los carros hicieran carreras", "Para que se vieran bonitas", "Para que el agua de lluvia escurriera"],
        hint: "¿Qué les pasa a los charcos en una cuesta?",
        explain: "Con el centro más alto, el agua de lluvia escurría hacia los lados, y así la calzada se mantenía seca y fuerte."
      },
      {
        q: "¿Qué es la piedra clave?",
        choices: ["Una llave de las puertas de la ciudad", "La piedra en forma de cuña que está arriba del todo en un arco", "La primera piedra que se pone en una calzada"],
        hint: "Es la piedra que «cierra» algo y lo deja fijo.",
        explain: "La piedra clave está arriba del todo en el arco y sujeta las demás piedras en su sitio."
      }
    ]
  },

  // ───────────── Floor 4 ─────────────
  'h4-silk-road': {
    title: "Comerciantes de la Ruta de la Seda",
    topicName: "La Ruta de la Seda",
    blurb: "Únete a una caravana de camellos y descubre cómo cruzaban Asia las mercancías y las ideas.",
    reading: [
      { title: "No era un solo camino", text: "La Ruta de la Seda no era un único camino, sino una red de rutas comerciales que unía China, Asia Central, la India, Persia y el Mediterráneo. Pocos comerciantes hacían todo el recorrido; las mercancías pasaban de un mercader a otro." },
      { title: "¿Qué se comerciaba?", text: "China enviaba seda, que los romanos ricos apreciaban muchísimo. Por las rutas también viajaban especias, caballos, vidrio, jade, oro, plata y papel." },
      { title: "Las ideas también viajan", text: "Por estas rutas se difundieron religiones como el budismo, además de música, comidas, arte y técnicas como la fabricación de papel. Por desgracia, las enfermedades también viajaban: la peste negra probablemente se extendió en parte por ellas en el siglo XIV." },
      { title: "Un nombre de después", text: "Los comerciantes nunca la llamaron Ruta de la Seda. Un geógrafo alemán le dio ese nombre en 1877, porque la seda era una de sus mercancías más famosas." }
    ],
    dialogue: {
      npc: { name: "Varzak", role: "mercader de Sogdiana" },
      intro: "¡Te damos la bienvenida a nuestra caravana! Soy Varzak, mercader de Sogdiana, en Asia Central. Mis camellos están descansando, así que tenemos tiempo para charlar.",
      topics: [
        { ask: "¿Viajas desde China hasta Roma?", answer: "¡Casi nadie lo hace! Compro seda en una ciudad con mercado, la llevo hacia el oeste hasta Samarcanda y se la vendo a otro comerciante. Las mercancías hacen todo el viaje; las personas, casi nunca." },
        { ask: "¿Por qué la seda es tan valiosa?", answer: "La seda es ligera, suave y resistente, y durante mucho tiempo solo China sabía hacerla, con los capullos de los gusanos de seda que comen hojas de morera. Lejos de China, la gente pagaba precios altísimos por ella." },
        { ask: "¿Por qué viajas con camellos?", answer: "Nuestros camellos bactrianos, de dos jorobas, guardan grasa en las jorobas, así que pueden pasar días sin comer ni beber, y aguantan noches heladas y días abrasadores." },
        { ask: "¿Qué viaja contigo además de las mercancías?", answer: "¡Cuentos, canciones, recetas y creencias! Los monjes budistas recorren estos caminos, y también nuevas técnicas como la fabricación de papel. Una ruta comercial también es un camino para las ideas." },
        { ask: "¿Es peligroso el viaje?", answer: "Mucho. ¡Tormentas de arena, pasos de alta montaña y bandidos! Por eso viajamos en caravanas grandes y paramos en caravasares, que son posadas rodeadas de murallas fuertes." }
      ],
      challenge: {
        q: "¿Por qué fue importante la Ruta de la Seda para la historia, y no solo para comprar cosas?",
        choices: ["Hizo que todo el mundo hablara un solo idioma", "Llevó ideas, religiones e inventos de una cultura a otra", "Sustituyó todos los viajes por mar"],
        explain: "Además de mercancías, los comerciantes y viajeros llevaban creencias, arte, técnicas e inventos, y unieron culturas que nunca se habían conocido."
      },
      farewell: "¡La caravana se va! Que tu camino sea llano y tus odres de agua estén siempre llenos."
    },
    timeline: {
      title: "A lo largo de la Ruta de la Seda",
      events: [
        { label: "Zhang Qian viaja hacia el oeste por encargo del emperador Han de China", when: "hacia 138 a. C." },
        { label: "La fabricación de papel llega a Bagdad", when: "hacia 795" },
        { label: "Marco Polo sale de Venecia rumbo a China", when: "1271" },
        { label: "La peste negra llega a Europa", when: "1347" },
        { label: "Se usa por primera vez el nombre «Ruta de la Seda»", when: "1877" }
      ]
    },
    artifact: {
      name: "Una pieza de seda",
      text: "El hilo de seda sale de los capullos de los gusanos de seda. ¡Cada capullo está hecho de un único hilo que puede medir cientos de metros! China guardó el secreto de la seda durante siglos, y por eso la seda valía tanto lejos de allí."
    },
    quiz: [
      {
        q: "¿Era la Ruta de la Seda un solo camino?",
        choices: ["Sí, una carretera pavimentada de China a Roma", "No, era una red de muchas rutas comerciales", "Sí, pero solo por mar"],
        hint: "Piensa en una red, no en una línea.",
        explain: "Era toda una red de rutas por tierra, y las mercancías pasaban de un comerciante a otro."
      },
      {
        q: "¿De dónde sale la seda?",
        choices: ["De las plantas de algodón", "De la lana de oveja", "De los capullos de los gusanos de seda", "De las telarañas"],
        hint: "Un bichito que mastica hojas de morera.",
        explain: "La seda se desenrolla de los capullos que tejen los gusanos de seda."
      },
      {
        q: "¿Qué eran los caravasares?",
        choices: ["Posadas con murallas donde descansaban los comerciantes", "Carreras de camellos", "Fábricas de seda"],
        hint: "Los viajeros y los camellos cansados necesitaban un lugar seguro para pasar la noche.",
        explain: "Los caravasares eran posadas con murallas junto al camino, donde las caravanas podían descansar seguras y comerciar."
      },
      {
        q: "¿Cuál de estas cosas se extendió desde China hacia el oeste por las rutas comerciales?",
        choices: ["La máquina de vapor", "El telescopio", "La bombilla", "La fabricación de papel"],
        hint: "Las otras tres se inventaron mucho después, y no en China.",
        explain: "La fabricación de papel se extendió desde China, a través de Asia Central, hasta Bagdad y, más tarde, hasta Europa."
      }
    ]
  },

  'h4-ancient-china-inventions': {
    title: "Inventos de la antigua China",
    topicName: "La antigua China",
    blurb: "Haz papel, imprime una página y recorre la Gran Muralla.",
    reading: [
      { title: "El papel", text: "Hacia el año 105 d. C., un funcionario llamado Cai Lun presentó una forma mejor de hacer papel con corteza de árbol, cáñamo, trapos viejos y redes de pesca. El papel ya existía, pero su método lo hizo más barato y mejor." },
      { title: "La brújula", text: "Unos sabios chinos descubrieron que una aguja imantada apunta al norte y al sur. Hacia el año 1100, los marineros chinos ya usaban brújulas para orientarse en el mar, incluso con el cielo nublado." },
      { title: "La imprenta", text: "Los impresores chinos tallaban una página entera en un bloque de madera, le ponían tinta y apretaban el papel encima. El Sutra del Diamante, impreso en el 868 d. C., es el libro impreso con fecha más antiguo que conocemos." },
      { title: "La Gran Muralla", text: "La Gran Muralla son en realidad muchas murallas, construidas y reconstruidas por distintas dinastías durante más de 2000 años. Y no, no se puede ver desde la Luna: es demasiado estrecha." }
    ],
    dialogue: {
      npc: { name: "Mei", role: "fabricante de papel y cuentacuentos de la antigua China" },
      intro: "¡Te doy la bienvenida a mi taller! Soy Mei y hago papel. ¡Cuidado, que la pasta está mojada! ¿Qué te gustaría saber?",
      topics: [
        { ask: "¿Cómo haces papel?", answer: "Remojo corteza, cáñamo y trapos viejos, y luego los machaco hasta hacer una pasta aguada. La recojo con un tamiz fino, el agua se escurre y la capa fina de fibras se seca y se convierte en una hoja." },
        { ask: "¿Sobre qué escribía la gente antes del papel?", answer: "Sobre tiras de bambú atadas entre sí, o sobre seda. El bambú pesa mucho y la seda es carísima. El papel es ligero y barato, y eso lo cambió todo." },
        { ask: "¿Cómo funciona una brújula?", answer: "Una aguja imantada gira hasta alinearse con el norte y el sur gracias al magnetismo de la Tierra. Al principio, las brújulas ayudaban a planear edificios; más tarde, los marineros las usaron para guiar sus barcos." },
        { ask: "¿Cómo ayudó la imprenta?", answer: "Antes de la imprenta, cada libro se copiaba a mano. Con un bloque tallado, un impresor podía hacer muchas copias de una página rápidamente. Hacia el año 1040, un inventor llamado Bi Sheng incluso hizo letras móviles de arcilla cocida." },
        { ask: "¿Quién construyó la Gran Muralla?", answer: "Muchas dinastías durante más de 2000 años, con muchísimos soldados, campesinos y prisioneros. Las famosas partes de ladrillo y piedra que ves en las fotos las construyó sobre todo la dinastía Ming, entre los siglos XIV y XVII." }
      ],
      challenge: {
        q: "¿Se puede ver la Gran Muralla desde la Luna solo con los ojos?",
        choices: ["Sí, se ve fácilmente", "Solo en las noches despejadas", "No, es demasiado estrecha para verla desde tan lejos"],
        explain: "La muralla es larga, pero solo mide unos pocos metros de ancho. Desde la Luna, a unos 384 000 km, nadie podría verla. Incluso desde mucho más cerca, en órbita, cuesta mucho distinguirla."
      },
      farewell: "¡Que te vaya bien! La próxima vez que escribas en papel, acuérdate de nosotros."
    },
    timeline: {
      title: "Inventos chinos",
      events: [
        { label: "El primer emperador une murallas más antiguas", when: "hacia 220 a. C." },
        { label: "Cai Lun presenta su papel mejorado", when: "105 d. C." },
        { label: "Se imprime el Sutra del Diamante con bloques de madera", when: "868 d. C." },
        { label: "Bi Sheng inventa los tipos móviles de arcilla", when: "hacia 1040" },
        { label: "La dinastía Ming reconstruye la Gran Muralla con ladrillo y piedra", when: "hacia 1500" }
      ]
    },
    artifact: {
      name: "Una antigua brújula china",
      text: "Las primeras brújulas chinas usaban una aguja imantada que a veces flotaba en un cuenco con agua o colgaba de un hilo de seda. La giraras hacia donde la giraras, la aguja volvía a apuntar al norte y al sur."
    },
    quiz: [
      {
        q: "Antes del papel, ¿sobre qué escribía a menudo la gente en China?",
        choices: ["Sobre vidrio", "Sobre tiras de bambú y seda", "Sobre láminas de plástico"],
        hint: "Uno pesaba mucho y el otro era carísimo.",
        explain: "La gente escribía en tiras de bambú atadas entre sí, o en seda. El papel era más ligero y más barato."
      },
      {
        q: "¿De qué hizo Bi Sheng sus tipos móviles?",
        choices: ["De arcilla cocida", "De hierro", "De vidrio"],
        hint: "El mismo material que usan los alfareros, endurecido en el fuego.",
        explain: "Bi Sheng hizo cada carácter de arcilla y lo coció hasta que quedó duro, hacia el año 1040."
      },
      {
        q: "¿Por qué era tan útil imprimir con bloques tallados?",
        choices: ["Hacía los libros impermeables", "Traducía los libros a otros idiomas", "Se podían hacer muchas copias de una página rápidamente"],
        hint: "Piensa en copiar un libro a mano, una y otra vez.",
        explain: "Una vez tallado, un bloque podía imprimir la misma página muchas veces, mucho más rápido que copiarla a mano."
      },
      {
        q: "¿Quién construyó la Gran Muralla?",
        choices: ["Un solo emperador, durante su vida", "Ingenieros romanos", "Los mongoles", "Muchas dinastías durante más de 2000 años"],
        hint: "Se construyó y se reconstruyó una y otra vez.",
        explain: "Distintas dinastías chinas construyeron y reconstruyeron murallas durante más de 2000 años. Los Ming hicieron gran parte de lo que vemos hoy."
      },
      {
        q: "¿Hacia dónde apunta la aguja de una brújula?",
        choices: ["Al norte y al sur", "Arriba y abajo", "Hacia el río más cercano"],
        hint: "Los marineros la usaban para saber hacia dónde iban.",
        explain: "Una aguja imantada se alinea con el magnetismo de la Tierra y apunta al norte y al sur."
      }
    ]
  },

  // ───────────── Floor 5 ─────────────
  'h5-mali-empire': {
    title: "El Imperio de Malí",
    topicName: "El Imperio de Malí",
    blurb: "Oro, sal y una ciudad de libros en el África occidental medieval.",
    reading: [
      { title: "Un imperio de oro", text: "El Imperio de Malí surgió en África occidental hacia 1235, cuando Sundiata Keita unió a los pueblos mandé. En su mejor momento se extendía desde la costa del Atlántico hasta muy lejos a lo largo del río Níger, y fue uno de los imperios más grandes de su época." },
      { title: "Oro a cambio de sal", text: "Malí tenía ricos yacimientos de oro, mientras que la sal venía de minas en lo más profundo del desierto del Sahara. Caravanas de camellos cruzaban el desierto para comerciar con ellos. La sal era escasa y vital, así que se cambiaba por oro." },
      { title: "Mansa Musa", text: "En 1324, el gobernante de Malí, Mansa Musa, viajó a La Meca con una caravana enorme cargada de oro. Gastó y regaló tanto en El Cairo que allí el oro perdió valor durante años, y Malí se hizo famoso en toda Europa y Oriente Medio." },
      { title: "Ciudad de libros", text: "Tombuctú se convirtió en un centro del saber, con mezquitas, escuelas y sabios. Las familias de allí han guardado cientos de miles de manuscritos escritos a mano sobre astronomía, medicina, matemáticas, derecho y poesía." }
    ],
    dialogue: {
      npc: { name: "Bakary", role: "copista de libros en Tombuctú" },
      intro: "¡La paz sea contigo! Soy Bakary. Copio libros a mano aquí, en Tombuctú. Ven a la sombra del patio y charlamos.",
      topics: [
        { ask: "¿Por qué Malí es tan rico?", answer: "¡Por el oro! Nuestras tierras tienen algunos de los yacimientos de oro más ricos de esta época. Los comerciantes cruzan el Sahara para cambiar sal, cobre y telas por oro, y el imperio se enriquece cobrando impuestos sobre ese comercio." },
        { ask: "¿Por qué alguien cambiaría oro por sal?", answer: "Con este calor, al sudar pierdes la sal que tu cuerpo necesita, y la sal evita que la carne y el pescado se echen a perder. Viene de minas muy al norte, en el desierto, así que aquí escasea, y lo que escasea es valioso." },
        { ask: "¿Quién fue Mansa Musa?", answer: "Nuestro gobernante más famoso. En 1324 cruzó el desierto hasta La Meca con miles de personas y camellos cargados de oro. Gastó con tanta generosidad en El Cairo que allí el oro perdió valor durante años." },
        { ask: "¿Qué libros copias?", answer: "Libros sobre las estrellas, la medicina, las matemáticas, el derecho, la religión y la poesía. Vienen sabios de muy lejos a estudiar aquí, y las familias atesoran estos manuscritos y los pasan de generación en generación." },
        { ask: "¿Por qué estos libros siguen siendo importantes?", answer: "Hubo quien afirmó, sin razón, que África no tenía historia escrita. Manuscritos como estos demuestran lo contrario. Mucho después de mi época, en 2012 y 2013, unos bibliotecarios muy valientes sacaron a escondidas cientos de miles de ellos para ponerlos a salvo durante una guerra." }
      ],
      challenge: {
        q: "¿Por qué la sal era tan valiosa en Malí?",
        choices: ["La gente la necesitaba para estar sana y conservar la comida, y allí escaseaba", "Se podía convertir en oro", "Los camellos no comían otra cosa"],
        explain: "La sal repone lo que el cuerpo pierde con el calor y conserva los alimentos. Tenía que venir de muy lejos, del otro lado del desierto, así que era escasa y valiosa."
      },
      farewell: "¡Que tu viaje sea seguro y tu mente esté llena de libros! ¡Que te vaya bien!"
    },
    timeline: {
      title: "Malí y Tombuctú",
      events: [
        { label: "Sundiata Keita funda el Imperio de Malí", when: "hacia 1235" },
        { label: "Peregrinación de Mansa Musa a La Meca", when: "1324" },
        { label: "Mansa Musa aparece dibujado en el Atlas catalán, un famoso mapa europeo", when: "hacia 1375" },
        { label: "El Imperio songhai toma el control de Tombuctú", when: "1468" },
        { label: "Los manuscritos de Tombuctú se ponen a salvo", when: "2012–2013" }
      ]
    },
    artifact: {
      name: "Una moneda de oro con oro de África occidental",
      text: "Malí no acuñaba sus propias monedas: el oro solía cambiar de manos en polvo y en pepitas. Pero gran parte del oro de las monedas medievales del norte de África y de Europa venía de África occidental, llevado a través del Sahara por caravanas de camellos."
    },
    quiz: [
      {
        q: "¿Qué dos productos eran los más famosos del comercio a través del Sahara?",
        choices: ["Seda y té", "Carbón y hierro", "Oro y sal"],
        hint: "Uno brillaba; el otro lo echas en la comida.",
        explain: "El oro de Malí se cambiaba por sal de las minas del Sahara."
      },
      {
        q: "¿Por qué era famosa Tombuctú?",
        choices: ["Por construir pirámides", "Por sus sabios y sus manuscritos escritos a mano", "Por construir barcos para el Atlántico", "Por sus castillos gigantes de piedra"],
        hint: "Bakary los copia a mano.",
        explain: "Tombuctú era un centro del saber, y sus familias todavía guardan cientos de miles de manuscritos."
      },
      {
        q: "¿Qué pasó cuando Mansa Musa gastó tanto oro en El Cairo?",
        choices: ["El oro valió menos allí durante años", "El Cairo se quedó sin sal", "Se convirtió en gobernante de Egipto"],
        hint: "Cuando algo se vuelve muy común, ¿vale más o menos?",
        explain: "Llegó tanto oro a El Cairo que su valor bajó, una señal de lo rico que era Malí."
      },
      {
        q: "¿Quién fundó el Imperio de Malí?",
        choices: ["Mansa Musa", "Cleopatra", "Sundiata Keita"],
        hint: "No fue el famoso viajero que fue a La Meca, que llegó después.",
        explain: "Sundiata Keita fundó el imperio hacia 1235. Mansa Musa gobernó unos 75 años más tarde."
      },
      {
        q: "¿Por qué son importantes hoy los manuscritos de Tombuctú?",
        choices: ["Son los libros más antiguos de la Tierra", "Están escritos en inglés", "Muestran que en África occidental floreció un rico mundo de escritura y saber", "Son mapas de oro escondido"],
        hint: "Piensa en la idea equivocada que algunas personas tuvieron sobre la historia de África.",
        explain: "Los manuscritos demuestran que África occidental tuvo sabios, bibliotecas y siglos de conocimiento escrito."
      }
    ]
  },

  'h5-printing-press': {
    title: "La imprenta",
    topicName: "La imprenta",
    blurb: "Compón tipos de metal en un taller de imprenta de Maguncia, en la década de 1450.",
    reading: [
      { title: "Copiar a mano", text: "Antes de que la imprenta llegara a Europa, cada libro se copiaba a mano, por monjes o por escribas profesionales. Copiar una sola Biblia podía llevarle a un escriba muchos meses, así que los libros eran escasos y muy caros." },
      { title: "La idea de Gutenberg", text: "Hacia 1450, en Maguncia (Alemania), Johannes Gutenberg desarrolló los tipos móviles de metal: letras sueltas fundidas en metal que se podían ordenar para formar páginas, imprimir y luego volver a usar. Añadió una tinta a base de aceite y una prensa de tornillo como las que se usaban para las uvas." },
      { title: "No fue el primero", text: "Gutenberg no fue el primero en imprimir con tipos móviles. Bi Sheng, en China, usó tipos de arcilla hacia 1040, y en Corea se imprimió con tipos de metal un libro llamado Jikji en 1377. Pero el sistema de Gutenberg se extendió rápidamente por Europa." },
      { title: "Por qué es importante", text: "Para el año 1500, las imprentas de más de 200 ciudades europeas habían impreso millones de libros. Con libros más baratos, más gente aprendió a leer y las nuevas ideas se difundieron más rápido que nunca." }
    ],
    dialogue: {
      npc: { name: "Konrad", role: "cajista en un taller de imprenta de Maguncia, década de 1450" },
      intro: "¡Cuidado con la tinta! Soy Konrad y compongo tipos en un taller de imprenta aquí, en Maguncia. Estamos imprimiendo algo grande. Ven a verlo.",
      topics: [
        { ask: "¿Qué estás imprimiendo?", answer: "Una Biblia en latín, con dos columnas en cada página. Vamos a hacer unos 180 ejemplares. ¡Un escriba podría tardar un año o más en copiar solo uno!" },
        { ask: "¿Cómo compones los tipos?", answer: "Saco las letras de metal de una caja de tipos, una por una, y las pongo en fila en un componedor. Cada letra está fundida al revés, porque al imprimir sale como en un espejo. Luego se encajan páginas enteras en un marco." },
        { ask: "¿Cómo se hacen las letras?", answer: "El ingenioso molde de mano de Gutenberg nos permite fundir rápidamente muchas letras idénticas con una mezcla de plomo, estaño y antimonio. Se derrite con facilidad y se endurece rápido." },
        { ask: "¿Cómo funciona la prensa?", answer: "Untamos los tipos con una tinta pegajosa a base de aceite, ponemos encima papel húmedo y luego tiramos de una barra que gira un gran tornillo y aprieta con fuerza. ¡Lo levantas y ahí tienes una página impresa!" },
        { ask: "¿Por qué la imprenta es algo tan importante?", answer: "Los libros serán más baratos, así que mucha más gente podrá tenerlos y aprender a leer. Las ideas se difundirán más rápido de lo que cualquier escriba podría copiarlas, y cada ejemplar dirá exactamente lo mismo." }
      ],
      challenge: {
        q: "¿Qué hacía tan eficaz el sistema de Gutenberg?",
        choices: ["Cada página se tallaba en un solo bloque de madera", "Letras de metal reutilizables que se podían reordenar para cada página nueva", "Una máquina leía las palabras en voz alta"],
        explain: "Las letras de metal se fundían en grandes cantidades, se ordenaban para formar una página, se imprimían y luego se separaban para volver a usarlas en la página siguiente."
      },
      farewell: "¡Me vuelvo al trabajo! Estas páginas no se van a imprimir solas. Bueno, casi."
    },
    timeline: {
      title: "La historia de la imprenta",
      events: [
        { label: "Se imprime en China el Sutra del Diamante con bloques de madera", when: "868" },
        { label: "Bi Sheng hace tipos móviles de arcilla", when: "hacia 1040" },
        { label: "En Corea se imprime el Jikji con tipos de metal", when: "1377" },
        { label: "Se imprime en Maguncia la Biblia de Gutenberg", when: "hacia 1455" },
        { label: "Una prensa de vapor empieza a imprimir periódicos en Londres", when: "1814" }
      ]
    },
    artifact: {
      name: "Una prensa de imprenta de madera",
      text: "Este tipo de prensa usaba un gran tornillo de madera, como una prensa para exprimir uvas. Al girar la barra, una tabla plana llamada platina bajaba sobre el papel y los tipos entintados. Un equipo con experiencia podía imprimir cientos de pliegos al día."
    },
    quiz: [
      {
        q: "¿En qué ciudad imprimió Gutenberg su famosa Biblia?",
        choices: ["En Roma", "En París", "En Maguncia", "En Londres"],
        hint: "Es una ciudad de Alemania, a orillas del río Rin.",
        explain: "Gutenberg trabajaba en Maguncia (Alemania), donde se imprimió su Biblia hacia 1455."
      },
      {
        q: "¿Por qué las letras de metal se fundían al revés?",
        choices: ["Para confundir a los ladrones", "Porque al apretarlas sobre el papel se dan la vuelta", "Porque el alemán se lee al revés"],
        hint: "Piensa en un sello, o en tu letra vista en un espejo.",
        explain: "Como un sello de goma, los tipos imprimen una imagen de espejo, así que las letras tienen que estar invertidas para que se impriman bien."
      },
      {
        q: "¿Quién imprimió con tipos móviles antes que Gutenberg?",
        choices: ["Bi Sheng en China, e impresores en Corea", "Nadie, Gutenberg fue el primero", "Los antiguos romanos"],
        hint: "Mira hacia el este, siglos antes.",
        explain: "Bi Sheng usó tipos de arcilla hacia 1040, y en Corea se imprimió el Jikji con tipos de metal en 1377."
      },
      {
        q: "¿Cuál fue un gran efecto de la imprenta?",
        choices: ["Los escribas quedaron a cargo de todos los libros", "La gente dejó de aprender a leer", "Solo los reyes podían tener libros", "Los libros se abarataron y las ideas se difundieron más rápido"],
        hint: "¿Qué pasa cuando puedes hacer muchas copias rápidamente?",
        explain: "La imprenta hizo que los libros fueran más baratos y comunes, así que más gente leyó y las nuevas ideas se difundieron rápido."
      }
    ]
  },

  // ───────────── Floor 6 ─────────────
  'h6-age-of-exploration': {
    title: "La era de la exploración",
    topicName: "La era de la exploración",
    blurb: "Navega guiándote por las estrellas y escucha la historia completa de los grandes viajes.",
    reading: [
      { title: "¿Por qué navegar?", text: "En el siglo XV, los gobernantes y los mercaderes europeos querían una ruta por mar hacia las especias, la seda y el oro de Asia. Las mercancías que llegaban por tierra pasaban por muchos intermediarios, y cada uno subía el precio. Portugal y España abrieron el camino, enviando barcos a aguas que para ellos eran desconocidas." },
      { title: "Las herramientas del navegante", text: "Los marineros usaban una brújula magnética para saber la dirección, y un astrolabio o un cuadrante para medir la altura del Sol o de la estrella Polar. Así sabían su latitud: cuánto al norte o al sur estaban. Para calcular la longitud de forma fiable en el mar hubo que esperar hasta el siglo XVIII." },
      { title: "Un mundo redondo, ya conocido", text: "Los europeos con estudios sabían que la Tierra era redonda desde la época de la antigua Grecia, así que los exploradores no lo «demostraron». Lo que cambiaron los viajes fue el mapa: en 1522, los supervivientes de la expedición de Magallanes, guiados de vuelta a casa por Juan Sebastián Elcano, completaron la primera vuelta al mundo." },
      { title: "La otra cara de la historia", text: "Las tierras que los europeos llamaban «nuevas» ya eran el hogar de millones de personas. La conquista, la esclavitud y enfermedades como la viruela, que los pueblos indígenas nunca habían conocido, causaron un sufrimiento terrible. La historia honesta recuerda tanto la audacia como el daño." }
    ],
    dialogue: {
      npc: { name: "Duarte", role: "navegante de un barco portugués, década de 1490" },
      intro: "¡Bom dia! Soy Duarte, navegante. Nuestro barco zarpa al amanecer, así que charlemos mientras reviso mis cartas de navegación.",
      topics: [
        { ask: "¿Cómo sabes hacia dónde ir?", answer: "Mi brújula me da la dirección, incluso con nubes. A mediodía mido con mi astrolabio lo alto que está el Sol, y unas tablas convierten eso en latitud. Luego calculo nuestra velocidad y el tiempo para marcar nuestra posición en la carta." },
        { ask: "¿Por qué navegar hasta Asia?", answer: "La pimienta, el clavo y la canela valen una fortuna en Europa. Si rodeamos África navegando directo hasta la India, podemos comprarlos nosotros mismos, en vez de pagar a una cadena de comerciantes por el camino." },
        { ask: "¿No te da miedo caerte por el borde del mundo?", answer: "¡Ja! Los marineros con estudios saben que la Tierra es una esfera; los sabios griegos hasta calcularon su tamaño hace mucho tiempo. Lo que de verdad tememos son las tormentas, quedarnos sin agua dulce y el escorbuto." },
        { ask: "¿Qué es el escorbuto?", answer: "Una enfermedad terrible de los viajes largos: sangran las encías y las heridas viejas se vuelven a abrir. Mucho después de mi época, se descubrió que la causa es la falta de vitamina C, y que la fruta fresca, como los limones, la previene." },
        { ask: "¿Qué les pasa a las personas que ya viven en las tierras a las que llegan?", answer: "Esa es la parte más dura de esta historia. A muchas las atacaron, las esclavizaron o las expulsaron de sus tierras, y las nuevas enfermedades mataron a muchísimas. Estos viajes conectaron el mundo, pero a un precio terrible para quienes ya vivían allí." }
      ],
      challenge: {
        q: "¿Para qué usaban el astrolabio los navegantes?",
        choices: ["Para medir la profundidad del mar", "Para ver de cerca islas lejanas", "Para medir la altura del Sol o de las estrellas y calcular la latitud"],
        explain: "Al medir lo alto que estaba el Sol o la estrella Polar sobre el horizonte, un navegante podía calcular cuánto al norte o al sur estaba el barco."
      },
      farewell: "¡Buenos vientos! Un buen mapa muestra dónde estás. Quien estudia bien la historia también pregunta quién estaba allí antes."
    },
    timeline: {
      title: "Viajes que cambiaron el mapa",
      events: [
        { label: "Zheng He dirige el primero de siete grandes viajes chinos", when: "1405" },
        { label: "Colón llega al Caribe", when: "1492" },
        { label: "Vasco da Gama llega a la India rodeando África", when: "1498" },
        { label: "El barco de Elcano regresa tras la primera vuelta al mundo", when: "1522" },
        { label: "El reloj marino de John Harrison ayuda a resolver el problema de la longitud", when: "hacia 1761" }
      ]
    },
    artifact: {
      name: "Un globo terráqueo antiguo",
      text: "El globo terráqueo más antiguo que se conserva se hizo en Núremberg en 1492, justo antes de que la noticia del viaje de Colón llegara a Europa, así que en él no aparece América. En pocas décadas, los cartógrafos tuvieron que volver a dibujar el mundo."
    },
    quiz: [
      {
        q: "¿Por qué los gobernantes europeos querían una ruta por mar hacia Asia?",
        choices: ["Para demostrar que la Tierra era redonda", "Para comprar especias y seda directamente, sin pagar a muchos intermediarios", "Para escapar de los inviernos fríos"],
        hint: "Sigue el dinero: ¿qué añadía cada comerciante por el camino?",
        explain: "Los productos asiáticos eran muy valiosos en Europa, y una ruta directa por mar permitía saltarse a los comerciantes que subían el precio."
      },
      {
        q: "¿Qué problema de navegación no se resolvió de forma fiable hasta el siglo XVIII?",
        choices: ["Encontrar el norte con una brújula", "Calcular la latitud con el Sol", "Calcular la longitud en el mar"],
        hint: "Hacía falta un reloj muy preciso que aguantara el balanceo de un barco.",
        explain: "La longitud exigía medir el tiempo con precisión en el mar; los relojes marinos de John Harrison, en el siglo XVIII, por fin lo hicieron posible en la práctica."
      },
      {
        q: "¿Demostró Colón que la Tierra es redonda?",
        choices: ["No, los europeos con estudios lo sabían desde la antigua Grecia", "Sí, fue el primero en demostrarlo", "No, nadie lo supo hasta que hubo fotos desde el espacio"],
        hint: "Los sabios griegos incluso calcularon el tamaño de la Tierra, hace más de 2000 años.",
        explain: "Mucho antes de 1492, la gente con estudios ya sabía que la Tierra era redonda. El error de Colón fue creer que la Tierra era más pequeña de lo que es."
      },
      {
        q: "¿Qué causó más muertes entre los pueblos indígenas de América después de 1492?",
        choices: ["Los terremotos", "Las erupciones volcánicas", "Una larga sequía", "Enfermedades nuevas como la viruela"],
        hint: "Algo que los recién llegados traían sin querer.",
        explain: "Las enfermedades como la viruela, contra las que los pueblos indígenas no tenían defensas, fueron las que más vidas se llevaron, además del daño causado por la conquista y la esclavitud."
      },
      {
        q: "¿Qué expedición fue la primera en dar la vuelta al mundo navegando?",
        choices: ["La de Colón, en 1492", "La que empezó Magallanes y terminó Elcano, en 1522", "La de Vasco da Gama, en 1498"],
        hint: "Su jefe murió por el camino, y otra persona llevó el barco de vuelta a casa.",
        explain: "Magallanes murió en Filipinas en 1521, pero Elcano llevó el último barco de vuelta a España en 1522."
      }
    ]
  },

  'h6-industrial-revolution': {
    title: "La Revolución Industrial",
    topicName: "La Revolución Industrial",
    blurb: "Vapor, humo y máquinas de hilar, y la lucha por los derechos de la infancia.",
    reading: [
      { title: "La fuerza del vapor", text: "Desde mediados del siglo XVIII, Gran Bretaña empezó a fabricar productos con máquinas en vez de a mano. La máquina de vapor mejorada de James Watt, patentada en 1769, quemaba carbón para mover bombas y fábricas, y más tarde trenes y barcos." },
      { title: "Fábricas y ciudades", text: "Las máquinas de hilar y de tejer se reunieron en grandes fábricas textiles. Muchísima gente dejó el campo para irse a ciudades que crecían muy deprisa, como Mánchester, donde las viviendas estaban abarrotadas y el aire estaba lleno de humo." },
      { title: "Niños y niñas trabajando", text: "Muchos niños y niñas trabajaban en fábricas y minas, a menudo 12 horas al día o más, metiéndose a gatas bajo máquinas en marcha o arrastrando carretillas de carbón bajo tierra. Los accidentes y las enfermedades eran frecuentes." },
      { title: "Cambiar las reglas", text: "Reformistas y trabajadores lucharon por el cambio. La Ley de Fábricas de 1833 en Gran Bretaña prohibió la mayor parte del trabajo en fábricas textiles a los menores de 9 años, y en 1880 la escuela pasó a ser obligatoria entre los 5 y los 10 años. Por qué es importante: ir a la escuela en vez de ir a trabajar fue un derecho por el que la gente luchó." }
    ],
    dialogue: {
      npc: { name: "Nell", role: "obrera de una fábrica de algodón en Mánchester, década de 1830" },
      intro: "¡Habla más alto, que las máquinas hacen mucho ruido! Soy Nell. Trabajo en una fábrica de algodón aquí, en Mánchester. Mi turno casi ha terminado, así que puedo charlar.",
      topics: [
        { ask: "¿Qué haces en la fábrica?", answer: "Vigilo las máquinas de hilar y anudo los hilos rotos antes de que se enreden. Hacen falta dedos rápidos. Las máquinas nunca se cansan, así que se supone que nosotros tampoco." },
        { ask: "¿Cuánto dura tu jornada de trabajo?", answer: "Muchas veces doce horas o más, seis días a la semana. Una campana nos dice cuándo empezar y cuándo parar. En el campo, el trabajo seguía al sol y a las estaciones; aquí sigue al reloj." },
        { ask: "¿Por qué trabajan niños aquí?", answer: "Las familias necesitan cada sueldo, y los dueños pagan menos a los niños. Los más pequeños pueden meterse debajo de las máquinas para limpiarlas, y eso es muy peligroso. La gente está empezando a protestar." },
        { ask: "¿Qué hace en realidad una máquina de vapor?", answer: "Al quemar carbón, el agua hierve y se convierte en vapor. El vapor empuja un pistón adelante y atrás, ese movimiento hace girar una gran rueda, y unas correas llevan la fuerza a todas las máquinas de la fábrica." },
        { ask: "¿Mejorarán las cosas?", answer: "Los reformistas piden leyes que limiten las horas de trabajo de los niños y los lleven a la escuela. Más tarde, los sindicatos ayudan a los trabajadores a conseguir condiciones más seguras y jornadas más cortas. Lleva años, pero el cambio llega porque la gente alza la voz." }
      ],
      challenge: {
        q: "¿Qué hizo la Ley de Fábricas de 1833 en Gran Bretaña?",
        choices: ["Prohibió la mayor parte del trabajo en fábricas textiles a los menores de 9 años y limitó las horas de los mayores", "Prohibió todas las máquinas de vapor", "Hizo obligatoria la escuela para todos los niños"],
        explain: "La ley de 1833 impidió que la mayoría de las fábricas textiles contrataran a menores de 9 años, limitó las horas de los niños mayores y envió inspectores para comprobarlo. La escuela obligatoria llegó más tarde, en 1880."
      },
      farewell: "¡Ahí está la campana! Ve con cuidado, y alégrate de ir a la escuela y no a la fábrica."
    },
    timeline: {
      title: "Vapor, fábricas y reformas",
      events: [
        { label: "James Watt patenta su máquina de vapor mejorada", when: "1769" },
        { label: "Abre un ferrocarril público con trenes de vapor, de Stockton a Darlington", when: "1825" },
        { label: "La Ley de Fábricas limita el trabajo infantil en las fábricas textiles", when: "1833" },
        { label: "La Gran Exposición muestra máquinas nuevas en Londres", when: "1851" },
        { label: "La escuela pasa a ser obligatoria en Inglaterra y Gales de los 5 a los 10 años", when: "1880" }
      ]
    },
    artifact: {
      name: "Una máquina de vapor de balancín",
      text: "En una máquina de balancín, el vapor empujaba un pistón arriba y abajo, y este hacía oscilar una enorme viga de hierro, como un subibaja. La viga hacía girar un pesado volante, cuyo giro constante podía mover bombas o, mediante correas y ejes, todas las máquinas de una fábrica."
    },
    quiz: [
      {
        q: "¿Qué combustible quemaban la mayoría de las máquinas de vapor?",
        choices: ["Gasolina", "Carbón", "Energía solar", "Uranio"],
        hint: "Gran Bretaña tenía mucho bajo tierra, y los niños ayudaban a sacarlo de las minas.",
        explain: "Las máquinas de vapor quemaban carbón para hervir agua, y por eso la minería del carbón creció tan deprisa."
      },
      {
        q: "¿Por qué tanta gente se mudó a ciudades como Mánchester?",
        choices: ["Para encontrar trabajo en las nuevas fábricas", "Para ir a la playa", "Porque se prohibió la agricultura"],
        hint: "¿Dónde estaban los nuevos empleos?",
        explain: "Las fábricas de las ciudades necesitaban trabajadores, así que la gente dejó el campo para buscar empleo."
      },
      {
        q: "¿Por qué los dueños de las fábricas contrataban a niños?",
        choices: ["La ley lo exigía", "Los niños ya habían terminado la escuela", "Podían pagarles menos, y los niños pequeños cabían debajo de las máquinas"],
        hint: "Piensa en el dinero, y en el tamaño.",
        explain: "A los niños se les pagaba menos que a los adultos, y por ser pequeños podían meterse debajo de las máquinas, lo cual era muy peligroso."
      },
      {
        q: "¿Qué hizo la Ley de Educación de 1880 en Gran Bretaña?",
        choices: ["Prohibió todas las fábricas", "Cerró las minas de carbón", "Dio a cada niño un trabajo en una fábrica", "Hizo obligatoria la escuela para los niños de 5 a 10 años"],
        hint: "Trata de dónde deberían pasar el día los niños, en lugar de en la fábrica.",
        explain: "Desde 1880, los niños de 5 a 10 años de Inglaterra y Gales tenían que ir a la escuela."
      },
      {
        q: "Dentro de una máquina de vapor, ¿qué empuja el pistón?",
        choices: ["El vapor del agua hirviendo", "El viento", "Unos imanes"],
        hint: "¡Está en el nombre!",
        explain: "El carbón calienta el agua hasta convertirla en vapor, y la presión del vapor empuja el pistón."
      }
    ]
  },

  // ───────────── Floor 7 ─────────────
  'h7-first-flight': {
    title: "El primer vuelo",
    topicName: "El primer vuelo a motor",
    blurb: "Doce segundos en Kitty Hawk que cambiaron el mundo.",
    reading: [
      { title: "Sueños de volar", text: "Durante siglos, la gente intentó volar con alas que se batían. Los globos aerostáticos llevaron personas por primera vez en 1783, y en la década de 1890 Otto Lilienthal hizo unos 2000 vuelos en planeador. Pero nadie había construido todavía un aparato a motor que un piloto pudiera controlar de verdad." },
      { title: "Dos hermanos de Ohio", text: "Wilbur y Orville Wright tenían una tienda de bicicletas en Dayton, Ohio. Estudiaron a las aves, construyeron su propio túnel de viento para probar formas de alas y se dieron cuenta de que el problema más difícil no era la potencia: era el control." },
      { title: "17 de diciembre de 1903", text: "Cerca de Kitty Hawk, en Carolina del Norte, Orville voló en el Wright Flyer durante 12 segundos y unos 37 metros (120 pies): el primer vuelo controlado y sostenido de una máquina a motor más pesada que el aire. Más tarde, ese mismo día, Wilbur voló 260 metros en 59 segundos." },
      { title: "Por qué es importante", text: "En pocas décadas, los aviones ya llevaban correo y pasajeros a través de los océanos. Solo 66 años después de aquel primer vuelo de 12 segundos, unos astronautas llegaron a la Luna, y hoy los viajes en avión conectan casi todos los países de la Tierra." }
    ],
    dialogue: {
      npc: { name: "Rosa", role: "mecánica de aviones e historiadora de la aviación" },
      intro: "¿Me pasas esa llave inglesa, por favor? Soy Rosa. Mantengo en vuelo aviones antiguos, y esta réplica del Wright Flyer es mi favorita. ¿Quieres oír su historia?",
      topics: [
        { ask: "¿Cómo dirigían el avión los hermanos Wright?", answer: "Con el «alabeo de las alas»: unos cables torcían las puntas de las alas para que un lado se elevara más que el otro, y así el avión se inclinaba para girar. Con un timón de profundidad delante y un timón de dirección detrás, el piloto podía controlar el alabeo, el cabeceo y la guiñada." },
        { ask: "¿De dónde salió el motor?", answer: "Ninguna empresa podía darles uno lo bastante ligero, así que su mecánico, Charlie Taylor, construyó en unas seis semanas un motor de 12 caballos con el cuerpo de aluminio. Movía dos hélices de madera que diseñaron los propios hermanos." },
        { ask: "¿Por qué Kitty Hawk?", answer: "Vientos fuertes y constantes para elevarse, arena blanda para aterrizar y poca gente mirando. Los datos de viento de la Oficina Meteorológica de Estados Unidos les ayudaron a elegir el lugar." },
        { ask: "¿El primer vuelo se hizo famoso enseguida?", answer: "¡Para nada! Solo lo vieron cinco personas del lugar, y muchos periódicos lo ignoraron o no se lo creyeron. Los hermanos siguieron mejorando sus aviones, y unos vuelos públicos en 1908 por fin los hicieron famosos en todo el mundo." },
        { ask: "¿Todavía existe el Flyer de verdad?", answer: "¡Sí! El Wright Flyer de 1903 cuelga en el Museo Nacional del Aire y el Espacio del Smithsonian, en Washington D. C. ¡Hasta viajaron a la Luna trocitos de su madera y de su tela con el Apolo 11!" }
      ],
      challenge: {
        q: "¿Cuál era, para los hermanos Wright, el problema clave del vuelo?",
        choices: ["Hacer el avión lo más pesado posible", "Controlar el avión en el aire", "Encontrar una pista lo bastante larga"],
        explain: "Otros ya tenían alas y motores; el gran avance de los Wright fue una forma de que el piloto controlara el avión en las tres direcciones."
      },
      farewell: "¡Gracias por la ayuda! La próxima vez que vueles en avión, acuérdate de dos fabricantes de bicicletas de Ohio."
    },
    timeline: {
      title: "A la conquista del cielo",
      events: [
        { label: "Por primera vez vuelan personas, en un globo aerostático sobre París", when: "1783" },
        { label: "Otto Lilienthal empieza sus vuelos en planeador en Alemania", when: "1891" },
        { label: "El Wright Flyer hace el primer vuelo a motor y controlado", when: "1903" },
        { label: "Charles Lindbergh cruza el Atlántico en avión, solo y sin escalas", when: "1927" },
        { label: "Un avión cohete, el Bell X-1, vuela por primera vez más rápido que el sonido", when: "1947" }
      ]
    },
    artifact: {
      name: "El Wright Flyer de 1903",
      text: "Un biplano de madera de abeto y tela de muselina, con 12 metros de envergadura. El piloto iba tumbado sobre el ala inferior y movía las caderas en una especie de cuna para torcer las alas. Solo voló cuatro veces, todas en un mismo día de diciembre, antes de que una ráfaga de viento lo volcara y lo dañara."
    },
    quiz: [
      {
        q: "¿Dónde fue el primer vuelo a motor y controlado?",
        choices: ["En París, Francia", "Cerca de Kitty Hawk, Carolina del Norte", "En Dayton, Ohio", "En Londres, Inglaterra"],
        hint: "Dunas de arena con mucho viento en la costa este de Estados Unidos.",
        explain: "Los Wright volaron cerca de Kitty Hawk, en Carolina del Norte, un lugar elegido por sus vientos constantes y su arena blanda."
      },
      {
        q: "¿Cuánto duró el primerísimo vuelo?",
        choices: ["12 segundos", "12 minutos", "2 horas"],
        hint: "Fue muy corto, menos de un minuto.",
        explain: "El primer vuelo de Orville duró unos 12 segundos y recorrió unos 37 metros (120 pies)."
      },
      {
        q: "¿Qué construyeron los hermanos Wright para probar formas de alas?",
        choices: ["Un cohete", "Un submarino", "Un túnel de viento"],
        hint: "Una caja donde se sopla aire sobre pequeñas maquetas de alas.",
        explain: "Su túnel de viento casero les permitió medir cómo funcionaban cientos de formas de alas."
      },
      {
        q: "¿Cómo ayudaba al piloto el «alabeo de las alas»?",
        choices: ["Plegaba las alas para guardarlas", "Hacía el motor más potente", "Protegía al piloto de la lluvia", "Torcía las puntas de las alas para que el avión pudiera inclinarse y girar"],
        hint: "Fíjate en cómo inclina las alas un pájaro para girar.",
        explain: "Al torcer las puntas de las alas, un ala se elevaba más que la otra, y así el avión podía inclinarse para girar."
      },
      {
        q: "¿Qué negocio tenían los hermanos Wright antes de volar?",
        choices: ["Un ferrocarril", "Una tienda de bicicletas", "Un astillero"],
        hint: "Dos ruedas, pedales y cadenas.",
        explain: "Fabricaban y reparaban bicicletas en Dayton, Ohio, y con ese negocio pagaban sus experimentos."
      }
    ]
  },

  'h7-moon-landing': {
    title: "Apolo 11: rumbo a la Luna",
    topicName: "La llegada a la Luna",
    blurb: "Siéntate en el Control de Misión mientras el Apolo 11 se posa en la Luna.",
    reading: [
      { title: "La carrera espacial", text: "Después de que la Unión Soviética lanzara el Sputnik, el primer satélite, en 1957, y enviara a Yuri Gagarin a la órbita terrestre en 1961, Estados Unidos se puso una meta audaz: llevar personas a la Luna y traerlas de vuelta sanas y salvas antes de 1970." },
      { title: "Tres astronautas", text: "El Apolo 11 despegó el 16 de julio de 1969 sobre un cohete gigante Saturno V. Neil Armstrong y Buzz Aldrin bajaron hasta la superficie en el módulo lunar Eagle, mientras Michael Collins daba vueltas alrededor de la Luna, solo, en el módulo de mando Columbia." },
      { title: "Un pequeño paso", text: "El Eagle se posó el 20 de julio de 1969, y unas horas después Armstrong se convirtió en la primera persona en pisar la Luna; después lo siguió Aldrin. Cientos de millones de personas lo vieron por televisión. Pasaron unas dos horas y media fuera y recogieron 21,5 kilogramos de rocas y suelo lunar." },
      { title: "Por qué es importante", text: "Unas 400 000 personas trabajaron en el programa Apolo, y demostraron lo que pueden lograr una ingeniería cuidadosa y el trabajo en equipo. Las rocas lunares enseñaron muchísimo a los científicos sobre cómo se formó la Luna, y el Apolo ayudó a impulsar la tecnología informática de la que dependemos hoy." }
    ],
    dialogue: {
      npc: { name: "Dee", role: "del equipo de ingeniería del Control de Misión en Houston, 1969" },
      intro: "¡Silencio en los auriculares, por favor, que estamos vigilando los datos! Soy Dee, del equipo de ingeniería aquí, en el Control de Misión de Houston. Acerca una silla.",
      topics: [
        { ask: "¿Qué se hace en el Control de Misión?", answer: "Vigilamos los datos en directo que llegan de la nave (combustible, oxígeno, temperaturas, la computadora) y en cada paso le decimos a la tripulación «adelante» o «alto». Cada consola tiene su especialista, y en salas detrás de nosotros hay más ingenieros ayudando." },
        { ask: "¿Qué pasó durante el alunizaje?", answer: "La computadora de guiado mostró las alarmas «1202» y «1201». Estaba sobrecargada, pero seguía haciendo sus tareas más importantes, así que dimos el «adelante». Luego Armstrong pilotó a mano para esquivar un campo de rocas enormes y se posó con muy poco combustible de sobra." },
        { ask: "¿Quién se quedó en órbita?", answer: "Michael Collins pilotaba el Columbia alrededor de la Luna, solo. Cada vez que pasaba por detrás de la Luna, se quedaba sin ningún contacto por radio con la Tierra. Sin él, los otros dos no tenían cómo volver a casa." },
        { ask: "¿Qué hicieron los astronautas en la Luna?", answer: "Clavaron una bandera, recogieron rocas y suelo lunar, y montaron experimentos, entre ellos un espejo en el que los científicos todavía hoy hacen rebotar láseres para medir la distancia entre la Tierra y la Luna." },
        { ask: "¿Qué potencia tenía la computadora de la nave?", answer: "La computadora de guiado del Apolo tenía unos 4 kilobytes de memoria de trabajo, muchísimo menos que cualquier teléfono de hoy. Margaret Hamilton dirigió el equipo del MIT que escribió su software de vuelo, diseñado para dar prioridad a las tareas más importantes si se sobrecargaba." }
      ],
      challenge: {
        q: "¿Qué astronauta del Apolo 11 NO caminó por la Luna?",
        choices: ["Neil Armstrong", "Buzz Aldrin", "Michael Collins"],
        explain: "Michael Collins se quedó en órbita en el Columbia mientras Armstrong y Aldrin caminaban por la superficie, y luego los llevó a todos de vuelta a casa."
      },
      farewell: "¡El Eagle ha aterrizado, y tú también! Gracias por hacerle compañía al Control de Misión."
    },
    timeline: {
      title: "La carrera hacia la Luna",
      events: [
        { label: "Se lanza el Sputnik, el primer satélite", when: "1957" },
        { label: "Yuri Gagarin se convierte en la primera persona en el espacio", when: "1961" },
        { label: "La tripulación del Apolo 8 es la primera en orbitar la Luna", when: "1968" },
        { label: "El Apolo 11 se posa en la Luna", when: "1969" },
        { label: "Apolo 17: la última vez que unas personas caminan por la Luna (por ahora)", when: "1972" }
      ]
    },
    artifact: {
      name: "Una bota lunar del Apolo",
      text: "Quienes caminaron por la Luna llevaban unos cubrebotas con suela de surcos encima de las botas del traje espacial, y esas suelas dejaron las famosas huellas. La tripulación del Apolo 11 dejó los suyos en la Luna para ahorrar peso. Como allí no hay viento ni lluvia, sus huellas podrían durar millones de años."
    },
    quiz: [
      {
        q: "¿Cómo se llamaba el módulo lunar del Apolo 11?",
        choices: ["Columbia", "Eagle", "Sputnik", "Saturno"],
        hint: "«El ____ ha aterrizado.»",
        explain: "Armstrong y Aldrin se posaron en el Eagle. El Columbia era el módulo de mando que se quedó en órbita."
      },
      {
        q: "¿Por qué Michael Collins perdía a veces el contacto por radio con la Tierra?",
        choices: ["Su radio estaba rota", "El Control de Misión se tomaba descansos", "La Luna bloqueaba la señal cuando él volaba por detrás"],
        hint: "Las ondas de radio viajan en línea recta.",
        explain: "Cuando el Columbia pasaba por detrás de la Luna, la propia Luna quedaba entre Collins y la Tierra y bloqueaba todas las señales de radio."
      },
      {
        q: "¿Qué causó la alarma «1202» durante el alunizaje?",
        choices: ["La computadora estaba sobrecargada de tareas", "Un incendio en el motor del cohete", "Una grieta en la ventana de la cabina"],
        hint: "La computadora tenía demasiadas cosas que hacer a la vez.",
        explain: "La computadora estaba sobrecargada, pero su software dejó de lado las tareas menos importantes y mantuvo en marcha las vitales, así que el alunizaje pudo continuar."
      },
      {
        q: "¿Cuál de estas cosas pasó primero?",
        choices: ["El Apolo 11 se posa en la Luna", "El Apolo 8 orbita la Luna", "Yuri Gagarin da la vuelta a la Tierra en órbita", "El Apolo 17, el último alunizaje"],
        hint: "Antes de ir a la Luna, alguien tenía que llegar al espacio.",
        explain: "Gagarin voló en 1961, el Apolo 8 orbitó la Luna en 1968, el Apolo 11 se posó en 1969 y el Apolo 17 llegó en 1972."
      },
      {
        q: "¿Qué experimento que se dejó en la Luna se sigue usando hoy?",
        choices: ["Una estación meteorológica", "Una central de energía solar", "Una radio que pone música", "Un espejo para hacer rebotar láseres y medir la distancia entre la Tierra y la Luna"],
        hint: "Desde la Tierra, los científicos le apuntan con un potente rayo de luz.",
        explain: "El reflector láser permite a los científicos medir cuánto tarda un pulso de láser en ir y volver, y así calcular la distancia entre la Tierra y la Luna con muchísima precisión."
      }
    ]
  }
};
