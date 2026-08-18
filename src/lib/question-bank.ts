/**
 * Built-in bilingual question bank.
 *
 * This exists so a quiz is never empty: when an admin does not upload their own
 * CSV, a quiz can be filled from here instead. Questions are pitched at Indian
 * school children (roughly classes 5–9) and every prompt and option carries its
 * Hindi counterpart, because the quiz runner shows one line of text per question
 * and one per option — there is no language toggle, the pair *is* the content.
 *
 * The bank is plain data with no side effects. Shuffling is seeded and happens
 * only inside the helpers, never at module scope: a module-scope Math.random()
 * would make the module non-deterministic across a server restart and would
 * break the seed script's idempotency.
 */

import { joinBilingualOption, joinBilingualText } from "@/lib/validation/quiz";

export const BANK_TOPICS = [
  "general",
  "science",
  "maths",
  "english",
  "history",
  "geography",
  "environment",
  "civics",
] as const;

export type BankTopic = (typeof BANK_TOPICS)[number];

export const BANK_TOPIC_LABELS: Record<BankTopic, { en: string; hi: string }> = {
  general: { en: "General knowledge", hi: "सामान्य ज्ञान" },
  science: { en: "Science", hi: "विज्ञान" },
  maths: { en: "Mathematics", hi: "गणित" },
  english: { en: "English", hi: "अंग्रेज़ी" },
  history: { en: "Indian history", hi: "भारतीय इतिहास" },
  geography: { en: "Indian geography", hi: "भारत का भूगोल" },
  environment: { en: "Environment", hi: "पर्यावरण" },
  civics: { en: "Civics", hi: "नागरिक शास्त्र" },
};

export type BankQuestion = {
  /** Stable slug. Never reuse one for different content — it is the dedupe key. */
  id: string;
  topic: BankTopic;
  text: string;
  textHi: string;
  options: string[];
  optionsHi: string[];
  correctIndex: number;
};

export const QUESTION_BANK: readonly BankQuestion[] = [
  // ---------------------------- General knowledge ----------------------------
  {
    id: "gk-national-animal",
    topic: "general",
    text: "What is the national animal of India?",
    textHi: "भारत का राष्ट्रीय पशु कौन-सा है?",
    options: ["Lion", "Tiger", "Elephant", "Peacock"],
    optionsHi: ["शेर", "बाघ", "हाथी", "मोर"],
    correctIndex: 1,
  },
  {
    id: "gk-rainbow-colours",
    topic: "general",
    text: "How many colours are there in a rainbow?",
    textHi: "इंद्रधनुष में कितने रंग होते हैं?",
    options: ["Five", "Six", "Seven", "Nine"],
    optionsHi: ["पाँच", "छह", "सात", "नौ"],
    correctIndex: 2,
  },
  {
    id: "gk-national-bird",
    topic: "general",
    text: "Which bird is the national bird of India?",
    textHi: "भारत का राष्ट्रीय पक्षी कौन-सा है?",
    options: ["Parrot", "Peacock", "Sparrow", "Crow"],
    optionsHi: ["तोता", "मोर", "गौरैया", "कौआ"],
    correctIndex: 1,
  },
  {
    id: "gk-festival-of-lights",
    topic: "general",
    text: "Which festival is known as the festival of lights?",
    textHi: "कौन-सा त्योहार रोशनी का त्योहार कहलाता है?",
    options: ["Holi", "Diwali", "Eid", "Baisakhi"],
    optionsHi: ["होली", "दीपावली", "ईद", "बैसाखी"],
    correctIndex: 1,
  },
  {
    id: "gk-national-fruit",
    topic: "general",
    text: "Which fruit is the national fruit of India?",
    textHi: "भारत का राष्ट्रीय फल कौन-सा है?",
    options: ["Banana", "Apple", "Mango", "Guava"],
    optionsHi: ["केला", "सेब", "आम", "अमरूद"],
    correctIndex: 2,
  },
  {
    id: "gk-leap-year-days",
    topic: "general",
    text: "How many days are there in a leap year?",
    textHi: "लीप वर्ष में कितने दिन होते हैं?",
    options: ["364 days", "365 days", "366 days", "367 days"],
    optionsHi: ["364 दिन", "365 दिन", "366 दिन", "367 दिन"],
    correctIndex: 2,
  },
  {
    id: "gk-sachin-sport",
    topic: "general",
    text: "Sachin Tendulkar is famous for which sport?",
    textHi: "सचिन तेंदुलकर किस खेल के लिए प्रसिद्ध हैं?",
    options: ["Hockey", "Cricket", "Football", "Badminton"],
    optionsHi: ["हॉकी", "क्रिकेट", "फ़ुटबॉल", "बैडमिंटन"],
    correctIndex: 1,
  },
  {
    id: "gk-national-flower",
    topic: "general",
    text: "Which flower is the national flower of India?",
    textHi: "भारत का राष्ट्रीय फूल कौन-सा है?",
    options: ["Rose", "Lotus", "Sunflower", "Marigold"],
    optionsHi: ["गुलाब", "कमल", "सूरजमुखी", "गेंदा"],
    correctIndex: 1,
  },
  {
    id: "gk-indian-currency",
    topic: "general",
    text: "What is the currency of India called?",
    textHi: "भारत की मुद्रा को क्या कहते हैं?",
    options: ["Rupee", "Dollar", "Taka", "Yen"],
    optionsHi: ["रुपया", "डॉलर", "टका", "येन"],
    correctIndex: 0,
  },

  // --------------------------------- Science ---------------------------------
  {
    id: "sci-red-planet",
    topic: "science",
    text: "Which planet is known as the Red Planet?",
    textHi: "किस ग्रह को लाल ग्रह कहा जाता है?",
    options: ["Venus", "Mars", "Jupiter", "Saturn"],
    optionsHi: ["शुक्र", "मंगल", "बृहस्पति", "शनि"],
    correctIndex: 1,
  },
  {
    id: "sci-boiling-point",
    topic: "science",
    text: "At what temperature does water boil?",
    textHi: "पानी किस तापमान पर उबलता है?",
    options: ["0 degrees Celsius", "50 degrees Celsius", "100 degrees Celsius", "200 degrees Celsius"],
    optionsHi: ["0 डिग्री सेल्सियस", "50 डिग्री सेल्सियस", "100 डिग्री सेल्सियस", "200 डिग्री सेल्सियस"],
    correctIndex: 2,
  },
  {
    id: "sci-photosynthesis-gas",
    topic: "science",
    text: "Which gas do plants take in to make their food?",
    textHi: "पौधे अपना भोजन बनाने के लिए कौन-सी गैस लेते हैं?",
    options: ["Oxygen", "Carbon dioxide", "Nitrogen", "Hydrogen"],
    optionsHi: ["ऑक्सीजन", "कार्बन डाइऑक्साइड", "नाइट्रोजन", "हाइड्रोजन"],
    correctIndex: 1,
  },
  {
    id: "sci-organ-pumps-blood",
    topic: "science",
    text: "Which organ pumps blood through our body?",
    textHi: "हमारे शरीर में रक्त को पंप करने वाला अंग कौन-सा है?",
    options: ["Lungs", "Heart", "Liver", "Kidney"],
    optionsHi: ["फेफड़े", "हृदय", "यकृत", "गुर्दा"],
    correctIndex: 1,
  },
  {
    id: "sci-largest-planet",
    topic: "science",
    text: "Which is the largest planet in our solar system?",
    textHi: "हमारे सौरमंडल का सबसे बड़ा ग्रह कौन-सा है?",
    options: ["Earth", "Mars", "Jupiter", "Neptune"],
    optionsHi: ["पृथ्वी", "मंगल", "बृहस्पति", "वरुण"],
    correctIndex: 2,
  },
  {
    id: "sci-evaporation",
    topic: "science",
    text: "What is the process of water changing into vapour called?",
    textHi: "पानी के वाष्प में बदलने की प्रक्रिया को क्या कहते हैं?",
    options: ["Condensation", "Evaporation", "Freezing", "Melting"],
    optionsHi: ["संघनन", "वाष्पीकरण", "जमना", "पिघलना"],
    correctIndex: 1,
  },
  {
    id: "sci-plant-food-part",
    topic: "science",
    text: "Which part of a plant makes its food?",
    textHi: "पौधे का कौन-सा भाग भोजन बनाता है?",
    options: ["Root", "Stem", "Leaf", "Flower"],
    optionsHi: ["जड़", "तना", "पत्ती", "फूल"],
    correctIndex: 2,
  },
  {
    id: "sci-smell-organ",
    topic: "science",
    text: "Which sense organ helps us to smell?",
    textHi: "सूँघने में कौन-सा ज्ञानेंद्रिय हमारी मदद करती है?",
    options: ["Ear", "Nose", "Tongue", "Skin"],
    optionsHi: ["कान", "नाक", "जीभ", "त्वचा"],
    correctIndex: 1,
  },
  {
    id: "sci-gravity",
    topic: "science",
    text: "Which force pulls objects towards the earth?",
    textHi: "कौन-सा बल वस्तुओं को पृथ्वी की ओर खींचता है?",
    options: ["Friction", "Gravity", "Magnetism", "Air pressure"],
    optionsHi: ["घर्षण", "गुरुत्वाकर्षण", "चुंबकत्व", "वायुदाब"],
    correctIndex: 1,
  },

  // ------------------------------- Mathematics -------------------------------
  {
    id: "math-7-times-8",
    topic: "maths",
    text: "What is 7 multiplied by 8?",
    textHi: "7 को 8 से गुणा करने पर कितना होता है?",
    options: ["54", "56", "58", "64"],
    optionsHi: ["54", "56", "58", "64"],
    correctIndex: 1,
  },
  {
    id: "math-hexagon-sides",
    topic: "maths",
    text: "How many sides does a hexagon have?",
    textHi: "षट्भुज की कितनी भुजाएँ होती हैं?",
    options: ["Four", "Five", "Six", "Eight"],
    optionsHi: ["चार", "पाँच", "छह", "आठ"],
    correctIndex: 2,
  },
  {
    id: "math-half-of-50",
    topic: "maths",
    text: "What is half of 50?",
    textHi: "50 का आधा कितना होता है?",
    options: ["15", "20", "25", "30"],
    optionsHi: ["15", "20", "25", "30"],
    correctIndex: 2,
  },
  {
    id: "math-smallest-prime",
    topic: "maths",
    text: "Which is the smallest prime number?",
    textHi: "सबसे छोटी अभाज्य संख्या कौन-सी है?",
    options: ["0", "1", "2", "3"],
    optionsHi: ["0", "1", "2", "3"],
    correctIndex: 2,
  },
  {
    id: "math-15-plus-27",
    topic: "maths",
    text: "What is 15 + 27?",
    textHi: "15 + 27 कितना होता है?",
    options: ["32", "42", "52", "62"],
    optionsHi: ["32", "42", "52", "62"],
    correctIndex: 1,
  },
  {
    id: "math-minutes-in-two-hours",
    topic: "maths",
    text: "How many minutes are there in 2 hours?",
    textHi: "2 घंटे में कितने मिनट होते हैं?",
    options: ["60 minutes", "100 minutes", "120 minutes", "180 minutes"],
    optionsHi: ["60 मिनट", "100 मिनट", "120 मिनट", "180 मिनट"],
    correctIndex: 2,
  },
  {
    id: "math-100-minus-45",
    topic: "maths",
    text: "What is 100 minus 45?",
    textHi: "100 में से 45 घटाने पर कितना बचता है?",
    options: ["45", "55", "65", "75"],
    optionsHi: ["45", "55", "65", "75"],
    correctIndex: 1,
  },
  {
    id: "math-square-perimeter",
    topic: "maths",
    text: "What is the perimeter of a square whose side is 5 cm?",
    textHi: "जिस वर्ग की भुजा 5 सेमी है, उसका परिमाप कितना होगा?",
    options: ["10 cm", "15 cm", "20 cm", "25 cm"],
    optionsHi: ["10 सेमी", "15 सेमी", "20 सेमी", "25 सेमी"],
    correctIndex: 2,
  },

  // --------------------------------- English ---------------------------------
  {
    id: "eng-plural-child",
    topic: "english",
    text: "What is the plural of the word 'child'?",
    textHi: "'child' शब्द का बहुवचन क्या है?",
    options: ["childs", "childes", "children", "childrens"],
    optionsHi: ["childs", "childes", "children", "childrens"],
    correctIndex: 2,
  },
  {
    id: "eng-opposite-victory",
    topic: "english",
    text: "What is the opposite of the word 'victory'?",
    textHi: "'victory' (जीत) का विलोम शब्द क्या है?",
    options: ["Success", "Defeat", "Joy", "Battle"],
    optionsHi: ["सफलता", "हार", "खुशी", "लड़ाई"],
    correctIndex: 1,
  },
  {
    id: "eng-find-the-verb",
    topic: "english",
    text: "In the sentence 'The girl reads a book', which word is the verb?",
    textHi: "वाक्य 'The girl reads a book' में क्रिया कौन-सा शब्द है?",
    options: ["The", "girl", "reads", "book"],
    optionsHi: ["The", "girl (लड़की)", "reads (पढ़ती है)", "book (किताब)"],
    correctIndex: 2,
  },
  {
    id: "eng-correct-spelling-receive",
    topic: "english",
    text: "Which of these spellings is correct?",
    textHi: "इनमें से कौन-सी वर्तनी सही है?",
    options: ["Recieve", "Receive", "Receeve", "Recive"],
    optionsHi: ["Recieve", "Receive", "Receeve", "Recive"],
    correctIndex: 1,
  },
  {
    id: "eng-past-tense-go",
    topic: "english",
    text: "What is the past tense of the verb 'go'?",
    textHi: "'go' क्रिया का भूतकाल रूप क्या है?",
    options: ["goed", "gone", "went", "going"],
    optionsHi: ["goed", "gone", "went", "going"],
    correctIndex: 2,
  },
  {
    id: "eng-article-before-hour",
    topic: "english",
    text: "Which article is used before the word 'hour'?",
    textHi: "'hour' शब्द से पहले कौन-सा आर्टिकल लगता है?",
    options: ["a", "an", "the", "No article is needed"],
    optionsHi: ["a", "an", "the", "कोई आर्टिकल नहीं"],
    correctIndex: 1,
  },
  {
    id: "eng-synonym-happy",
    topic: "english",
    text: "Which word means almost the same as 'happy'?",
    textHi: "'happy' के लगभग समान अर्थ वाला शब्द कौन-सा है?",
    options: ["Angry", "Glad", "Tired", "Afraid"],
    optionsHi: ["गुस्सैल", "प्रसन्न", "थका हुआ", "डरा हुआ"],
    correctIndex: 1,
  },
  {
    id: "eng-collective-bees",
    topic: "english",
    text: "A large group of bees flying together is called a ___.",
    textHi: "एक साथ उड़ती मधुमक्खियों के बड़े समूह को अंग्रेज़ी में क्या कहते हैं?",
    options: ["Herd", "Swarm", "Flock", "Pack"],
    optionsHi: ["Herd (मवेशियों का झुंड)", "Swarm (मधुमक्खियों का झुंड)", "Flock (पक्षियों का झुंड)", "Pack (भेड़ियों का झुंड)"],
    correctIndex: 1,
  },

  // ------------------------------ Indian history ------------------------------
  {
    id: "hist-father-of-nation",
    topic: "history",
    text: "Who is known as the Father of the Nation in India?",
    textHi: "भारत में राष्ट्रपिता किसे कहा जाता है?",
    options: ["Jawaharlal Nehru", "Mahatma Gandhi", "Sardar Patel", "Bhagat Singh"],
    optionsHi: ["जवाहरलाल नेहरू", "महात्मा गांधी", "सरदार पटेल", "भगत सिंह"],
    correctIndex: 1,
  },
  {
    id: "hist-independence-year",
    topic: "history",
    text: "In which year did India become independent?",
    textHi: "भारत किस वर्ष स्वतंत्र हुआ?",
    options: ["1942", "1945", "1947", "1950"],
    optionsHi: ["1942", "1945", "1947", "1950"],
    correctIndex: 2,
  },
  {
    id: "hist-national-anthem-author",
    topic: "history",
    text: "Who wrote the national anthem of India?",
    textHi: "भारत का राष्ट्रगान किसने लिखा था?",
    options: ["Bankim Chandra Chatterjee", "Rabindranath Tagore", "Sarojini Naidu", "Munshi Premchand"],
    optionsHi: ["बंकिम चंद्र चट्टोपाध्याय", "रवींद्रनाथ टैगोर", "सरोजिनी नायडू", "मुंशी प्रेमचंद"],
    correctIndex: 1,
  },
  {
    id: "hist-first-prime-minister",
    topic: "history",
    text: "Who was the first Prime Minister of India?",
    textHi: "भारत के पहले प्रधानमंत्री कौन थे?",
    options: ["Dr Rajendra Prasad", "Jawaharlal Nehru", "Lal Bahadur Shastri", "Sardar Patel"],
    optionsHi: ["डॉ. राजेंद्र प्रसाद", "जवाहरलाल नेहरू", "लाल बहादुर शास्त्री", "सरदार पटेल"],
    correctIndex: 1,
  },
  {
    id: "hist-taj-mahal-builder",
    topic: "history",
    text: "Which Mughal emperor had the Taj Mahal built?",
    textHi: "ताजमहल किस मुगल सम्राट ने बनवाया था?",
    options: ["Akbar", "Shah Jahan", "Aurangzeb", "Babur"],
    optionsHi: ["अकबर", "शाहजहाँ", "औरंगज़ेब", "बाबर"],
    correctIndex: 1,
  },
  {
    id: "hist-give-me-blood-slogan",
    topic: "history",
    text: "Who gave the slogan 'Give me blood and I will give you freedom'?",
    textHi: "'तुम मुझे खून दो, मैं तुम्हें आज़ादी दूँगा' का नारा किसने दिया था?",
    options: ["Bhagat Singh", "Subhas Chandra Bose", "Bal Gangadhar Tilak", "Chandrashekhar Azad"],
    optionsHi: ["भगत सिंह", "सुभाष चंद्र बोस", "बाल गंगाधर तिलक", "चंद्रशेखर आज़ाद"],
    correctIndex: 1,
  },
  {
    id: "hist-maratha-empire-founder",
    topic: "history",
    text: "Who founded the Maratha empire?",
    textHi: "मराठा साम्राज्य की स्थापना किसने की थी?",
    options: ["Chhatrapati Shivaji Maharaj", "Maharana Pratap", "Guru Gobind Singh", "Prithviraj Chauhan"],
    optionsHi: ["छत्रपति शिवाजी महाराज", "महाराणा प्रताप", "गुरु गोबिंद सिंह", "पृथ्वीराज चौहान"],
    correctIndex: 0,
  },
  {
    id: "hist-rani-lakshmibai-state",
    topic: "history",
    text: "Rani Lakshmibai was the queen of which princely state?",
    textHi: "रानी लक्ष्मीबाई किस रियासत की रानी थीं?",
    options: ["Jhansi", "Gwalior", "Awadh", "Mysore"],
    optionsHi: ["झाँसी", "ग्वालियर", "अवध", "मैसूर"],
    correctIndex: 0,
  },

  // ----------------------------- Indian geography -----------------------------
  {
    id: "geo-capital-of-india",
    topic: "geography",
    text: "What is the capital of India?",
    textHi: "भारत की राजधानी कौन-सी है?",
    options: ["Mumbai", "Kolkata", "New Delhi", "Chennai"],
    optionsHi: ["मुंबई", "कोलकाता", "नई दिल्ली", "चेन्नई"],
    correctIndex: 2,
  },
  {
    id: "geo-longest-river",
    topic: "geography",
    text: "Which is the longest river in India?",
    textHi: "भारत की सबसे लंबी नदी कौन-सी है?",
    options: ["Yamuna", "Ganga", "Godavari", "Narmada"],
    optionsHi: ["यमुना", "गंगा", "गोदावरी", "नर्मदा"],
    correctIndex: 1,
  },
  {
    id: "geo-northern-mountains",
    topic: "geography",
    text: "Which mountain range lies along the northern border of India?",
    textHi: "भारत की उत्तरी सीमा पर कौन-सी पर्वत श्रृंखला है?",
    options: ["Aravalli", "Vindhya", "Himalayas", "Satpura"],
    optionsHi: ["अरावली", "विंध्य", "हिमालय", "सतपुड़ा"],
    correctIndex: 2,
  },
  {
    id: "geo-southern-ocean",
    topic: "geography",
    text: "Which ocean lies to the south of India?",
    textHi: "भारत के दक्षिण में कौन-सा महासागर है?",
    options: ["Atlantic Ocean", "Pacific Ocean", "Indian Ocean", "Arctic Ocean"],
    optionsHi: ["अटलांटिक महासागर", "प्रशांत महासागर", "हिंद महासागर", "आर्कटिक महासागर"],
    correctIndex: 2,
  },
  {
    id: "geo-smallest-state",
    topic: "geography",
    text: "Which is the smallest state of India by area?",
    textHi: "क्षेत्रफल की दृष्टि से भारत का सबसे छोटा राज्य कौन-सा है?",
    options: ["Goa", "Sikkim", "Tripura", "Manipur"],
    optionsHi: ["गोवा", "सिक्किम", "त्रिपुरा", "मणिपुर"],
    correctIndex: 0,
  },
  {
    id: "geo-pink-city",
    topic: "geography",
    text: "Which Indian city is called the Pink City?",
    textHi: "भारत के किस शहर को गुलाबी नगर कहा जाता है?",
    options: ["Udaipur", "Jaipur", "Jodhpur", "Bikaner"],
    optionsHi: ["उदयपुर", "जयपुर", "जोधपुर", "बीकानेर"],
    correctIndex: 1,
  },
  {
    id: "geo-largest-desert",
    topic: "geography",
    text: "Which is the largest desert in India?",
    textHi: "भारत का सबसे बड़ा रेगिस्तान कौन-सा है?",
    options: ["Thar Desert", "Rann of Kutch", "Cold desert of Ladakh", "Deccan plateau"],
    optionsHi: ["थार रेगिस्तान", "कच्छ का रण", "लद्दाख का ठंडा रेगिस्तान", "दक्कन का पठार"],
    correctIndex: 0,
  },
  {
    id: "geo-western-sea",
    topic: "geography",
    text: "Which sea lies to the west of India?",
    textHi: "भारत के पश्चिम में कौन-सा सागर है?",
    options: ["Bay of Bengal", "Arabian Sea", "Red Sea", "Caspian Sea"],
    optionsHi: ["बंगाल की खाड़ी", "अरब सागर", "लाल सागर", "कैस्पियन सागर"],
    correctIndex: 1,
  },

  // ------------------------------- Environment -------------------------------
  {
    id: "env-renewable-source",
    topic: "environment",
    text: "Which of these is a renewable source of energy?",
    textHi: "इनमें से कौन ऊर्जा का नवीकरणीय स्रोत है?",
    options: ["Coal", "Petrol", "Solar energy", "Diesel"],
    optionsHi: ["कोयला", "पेट्रोल", "सौर ऊर्जा", "डीज़ल"],
    correctIndex: 2,
  },
  {
    id: "env-trees-release-gas",
    topic: "environment",
    text: "Which gas do trees release into the air during the day?",
    textHi: "पेड़ दिन के समय हवा में कौन-सी गैस छोड़ते हैं?",
    options: ["Carbon dioxide", "Oxygen", "Methane", "Smoke"],
    optionsHi: ["कार्बन डाइऑक्साइड", "ऑक्सीजन", "मीथेन", "धुआँ"],
    correctIndex: 1,
  },
  {
    id: "env-empty-plastic-bottle",
    topic: "environment",
    text: "What is the best thing to do with an empty plastic bottle?",
    textHi: "खाली प्लास्टिक की बोतल का सबसे अच्छा क्या किया जाए?",
    options: [
      "Throw it into a river",
      "Burn it at home",
      "Put it in the recycling bin",
      "Bury it in a field",
    ],
    optionsHi: [
      "नदी में फेंक दें",
      "घर पर जला दें",
      "रीसाइक्लिंग के डिब्बे में डालें",
      "खेत में गाड़ दें",
    ],
    correctIndex: 2,
  },
  {
    id: "env-save-water-habit",
    topic: "environment",
    text: "Which habit saves the most water at home?",
    textHi: "घर में सबसे अधिक पानी कौन-सी आदत बचाती है?",
    options: [
      "Repairing leaking taps",
      "Washing the yard every day",
      "Leaving the tap running while brushing",
      "Watering plants at noon",
    ],
    optionsHi: [
      "टपकते नल ठीक कराना",
      "रोज़ आँगन धोना",
      "ब्रश करते समय नल खुला छोड़ना",
      "दोपहर में पौधों को पानी देना",
    ],
    correctIndex: 0,
  },
  {
    id: "env-air-pollution-cause",
    topic: "environment",
    text: "Which of these pollutes the air the most?",
    textHi: "इनमें से कौन हवा को सबसे अधिक प्रदूषित करता है?",
    options: ["Planting trees", "Burning garbage", "Walking to school", "Using a cloth bag"],
    optionsHi: ["पेड़ लगाना", "कचरा जलाना", "पैदल स्कूल जाना", "कपड़े का थैला इस्तेमाल करना"],
    correctIndex: 1,
  },
  {
    id: "env-three-rs",
    topic: "environment",
    text: "What do the three R's of waste management stand for?",
    textHi: "कचरा प्रबंधन के तीन 'R' किसके लिए हैं?",
    options: [
      "Read, Write, Repeat",
      "Reduce, Reuse, Recycle",
      "Run, Rest, Return",
      "Rain, River, Road",
    ],
    optionsHi: [
      "पढ़ना, लिखना, दोहराना",
      "कम करना, दोबारा उपयोग, रीसाइकल",
      "दौड़ना, आराम, वापसी",
      "वर्षा, नदी, सड़क",
    ],
    correctIndex: 1,
  },
  {
    id: "env-national-aquatic-animal",
    topic: "environment",
    text: "Which animal is the national aquatic animal of India?",
    textHi: "भारत का राष्ट्रीय जलीय जीव कौन-सा है?",
    options: ["Ganges river dolphin", "Crocodile", "Rohu fish", "Turtle"],
    optionsHi: ["गंगा नदी की डॉल्फ़िन", "मगरमच्छ", "रोहू मछली", "कछुआ"],
    correctIndex: 0,
  },
  {
    id: "env-trees-and-soil",
    topic: "environment",
    text: "Planting trees on bare land mainly helps to do what?",
    textHi: "खाली ज़मीन पर पेड़ लगाने से मुख्य रूप से क्या लाभ होता है?",
    options: [
      "Increase soil erosion",
      "Hold the soil and stop erosion",
      "Dry up the soil completely",
      "Make the land barren",
    ],
    optionsHi: [
      "मिट्टी का कटाव बढ़ता है",
      "मिट्टी बँधी रहती है और कटाव रुकता है",
      "मिट्टी पूरी तरह सूख जाती है",
      "ज़मीन बंजर हो जाती है",
    ],
    correctIndex: 1,
  },

  // --------------------------------- Civics ---------------------------------
  {
    id: "civ-head-of-state",
    topic: "civics",
    text: "Who is the head of state of India?",
    textHi: "भारत का राष्ट्राध्यक्ष कौन होता है?",
    options: ["The Prime Minister", "The President", "The Chief Justice", "The Governor"],
    optionsHi: ["प्रधानमंत्री", "राष्ट्रपति", "मुख्य न्यायाधीश", "राज्यपाल"],
    correctIndex: 1,
  },
  {
    id: "civ-voting-age",
    topic: "civics",
    text: "What is the minimum age to vote in India?",
    textHi: "भारत में मतदान करने की न्यूनतम आयु क्या है?",
    options: ["16 years", "18 years", "21 years", "25 years"],
    optionsHi: ["16 वर्ष", "18 वर्ष", "21 वर्ष", "25 वर्ष"],
    correctIndex: 1,
  },
  {
    id: "civ-constitution-architect",
    topic: "civics",
    text: "Who is called the chief architect of the Indian Constitution?",
    textHi: "भारतीय संविधान का प्रमुख शिल्पकार किसे कहा जाता है?",
    options: ["Dr B. R. Ambedkar", "Mahatma Gandhi", "Sardar Patel", "Dr Rajendra Prasad"],
    optionsHi: ["डॉ. भीमराव अंबेडकर", "महात्मा गांधी", "सरदार पटेल", "डॉ. राजेंद्र प्रसाद"],
    correctIndex: 0,
  },
  {
    id: "civ-right-to-education-age",
    topic: "civics",
    text: "The Right to Education gives free schooling to children of which age group?",
    textHi: "शिक्षा का अधिकार किस आयु वर्ग के बच्चों को नि:शुल्क शिक्षा देता है?",
    options: ["3 to 8 years", "6 to 14 years", "10 to 18 years", "5 to 10 years"],
    optionsHi: ["3 से 8 वर्ष", "6 से 14 वर्ष", "10 से 18 वर्ष", "5 से 10 वर्ष"],
    correctIndex: 1,
  },
  {
    id: "civ-republic-day",
    topic: "civics",
    text: "Which day is celebrated as Republic Day in India?",
    textHi: "भारत में गणतंत्र दिवस किस दिन मनाया जाता है?",
    options: ["15 August", "26 January", "2 October", "14 November"],
    optionsHi: ["15 अगस्त", "26 जनवरी", "2 अक्टूबर", "14 नवंबर"],
    correctIndex: 1,
  },
  {
    id: "civ-lower-house",
    topic: "civics",
    text: "Which is the lower house of the Indian Parliament?",
    textHi: "भारतीय संसद का निचला सदन कौन-सा है?",
    options: ["Rajya Sabha", "Lok Sabha", "Vidhan Sabha", "Gram Sabha"],
    optionsHi: ["राज्यसभा", "लोकसभा", "विधानसभा", "ग्राम सभा"],
    correctIndex: 1,
  },
  {
    id: "civ-smallest-rural-unit",
    topic: "civics",
    text: "What is the smallest unit of rural local government in India?",
    textHi: "भारत में ग्रामीण स्थानीय शासन की सबसे छोटी इकाई कौन-सी है?",
    options: ["Gram Panchayat", "Zila Parishad", "Municipality", "Block Samiti"],
    optionsHi: ["ग्राम पंचायत", "ज़िला परिषद", "नगरपालिका", "ब्लॉक समिति"],
    correctIndex: 0,
  },
  {
    id: "civ-rights-document",
    topic: "civics",
    text: "Which document lists the fundamental rights of Indian citizens?",
    textHi: "भारतीय नागरिकों के मौलिक अधिकार किस दस्तावेज़ में दिए गए हैं?",
    options: ["The Constitution", "The ration card", "The census report", "The government gazette"],
    optionsHi: ["संविधान", "राशन कार्ड", "जनगणना रिपोर्ट", "सरकारी राजपत्र"],
    correctIndex: 0,
  },
];

/** How many questions the bank holds per topic. Cheap enough to compute eagerly. */
export const BANK_COUNTS_BY_TOPIC: Record<BankTopic, number> = BANK_TOPICS.reduce(
  (acc, topic) => {
    acc[topic] = QUESTION_BANK.filter((q) => q.topic === topic).length;
    return acc;
  },
  {} as Record<BankTopic, number>,
);

/**
 * mulberry32 — a tiny deterministic PRNG. The same seed always produces the same
 * draw, which is what lets the seed script re-run without churning a quiz's
 * questions.
 */
function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates on a copy, driven by the supplied RNG. */
function shuffled<T>(items: readonly T[], rand: () => number): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Turn a string into a 32-bit seed, so callers can seed from a slug. */
export function seedFrom(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export type PickOptions = {
  /** Same seed, same paper. Omit for a fresh draw on every call. */
  seed?: number;
  /** Restrict the draw to these topics. Omit for all of them. */
  topics?: readonly BankTopic[];
  /** Shuffle each question's options too, remapping the correct answer. */
  shuffleOptions?: boolean;
};

/**
 * Draw `count` questions spread ACROSS topics rather than all from one.
 *
 * Topics are shuffled internally and then visited round-robin, so a 10-question
 * paper touches up to ten different subjects before it ever takes a second
 * question from the same one. Returns fewer than `count` only when the bank (or
 * the topic filter) genuinely holds fewer.
 */
export function pickBankQuestions(count: number, opts: PickOptions = {}): BankQuestion[] {
  const rand = seededRandom(opts.seed ?? Math.floor(Math.random() * 0xffffffff));
  const topics = opts.topics?.length ? opts.topics : BANK_TOPICS;

  const pools = shuffled(topics, rand)
    .map((topic) => shuffled(QUESTION_BANK.filter((q) => q.topic === topic), rand))
    .filter((pool) => pool.length > 0);

  const picked: BankQuestion[] = [];
  for (let round = 0; picked.length < count; round++) {
    let tookAny = false;
    for (const pool of pools) {
      if (picked.length >= count) break;
      const q = pool[round];
      if (!q) continue;
      picked.push(q);
      tookAny = true;
    }
    if (!tookAny) break; // every pool exhausted
  }

  const paper = shuffled(picked, rand);
  if (opts.shuffleOptions === false) return paper;

  return paper.map((q) => {
    const order = shuffled(
      q.options.map((_, i) => i),
      rand,
    );
    return {
      ...q,
      options: order.map((i) => q.options[i]),
      optionsHi: order.map((i) => q.optionsHi[i]),
      correctIndex: order.indexOf(q.correctIndex),
    };
  });
}

export type BankQuizQuestion = {
  text: string;
  options: string[];
  correctIndex: number;
  points: number;
  order: number;
};

/**
 * Flatten bank questions into the shape the Quiz model stores. The model holds
 * one string per prompt and per option, so the Hindi is merged into the same
 * string using the same joiner the CSV importer uses — a question authored here
 * and one imported from a sheet are indistinguishable once stored.
 */
export function toQuizQuestions(questions: readonly BankQuestion[], points = 10): BankQuizQuestion[] {
  return questions.map((q, i) => ({
    text: joinBilingualText(q.text, q.textHi),
    options: q.options.map((opt, idx) => joinBilingualOption(opt, q.optionsHi[idx] ?? "")),
    correctIndex: q.correctIndex,
    points,
    order: i + 1,
  }));
}
