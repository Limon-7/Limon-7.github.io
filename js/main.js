// ============================================
// Md Malek Sarker - Portfolio JavaScript
// ============================================

// ----- Theme -----
// The initial theme is set by an inline script in <head> to avoid a flash.
function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  try { localStorage.setItem('theme', theme); } catch (e) {}
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#14273f' : '#1f3d63');
  document.querySelectorAll('.theme-toggle').forEach(btn => {
    btn.setAttribute('aria-pressed', String(theme === 'dark'));
    btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
  });
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  setTheme(current === 'dark' ? 'light' : 'dark');
}

// ----- Mobile menu -----
function toggleMenu() {
  const menu = document.getElementById('mobileMenu');
  const btn = document.querySelector('.menu-btn');
  if (!menu) return;
  menu.hidden = !menu.hidden;
  if (btn) btn.setAttribute('aria-expanded', String(!menu.hidden));
}

// ----- List filters (projects, publications, writing, news) -----
// Topic chips: <div data-filter-for="listId"> containing <button class="chip" data-filter="x">
// Dropdowns:   <select data-filter-list="listId">
// Search:      <input data-search-for="listId">, plus an optional <p data-empty-for="listId">
// Items carry data-type="a b c" (or are .pub entries). Groups (.project-group,
// [data-search-group]) hide when none of their items are showing.
const ITEM_SEL = '[data-type], .pub';

function applyListFilter(list) {
  const f = list.dataset.filter || 'all';
  const query = list.dataset.query || '';
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const items = [...list.querySelectorAll(ITEM_SEL)].filter(el => !el.querySelector(ITEM_SEL));
  let shown = 0;
  items.forEach(item => {
    const types = (item.dataset.type || '').split(' ');
    const text = item.textContent.toLowerCase();
    item.hidden = !((f === 'all' || types.includes(f)) && terms.every(t => text.includes(t)));
    if (!item.hidden) shown++;
  });
  list.querySelectorAll('.project-group, [data-search-group]').forEach(group => {
    group.hidden = !items.some(item => !item.hidden && group.contains(item));
  });
  const empty = document.querySelector(`[data-empty-for="${list.id}"]`);
  if (empty) {
    empty.hidden = shown > 0 || !terms.length;
    const term = empty.querySelector('.search-term');
    if (term) term.textContent = query;
  }
}

function initFilters() {
  document.querySelectorAll('[data-filter-for]').forEach(bar => {
    const list = document.getElementById(bar.dataset.filterFor);
    if (!list) return;
    bar.addEventListener('click', e => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      bar.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', 'false'));
      chip.setAttribute('aria-pressed', 'true');
      list.dataset.filter = chip.dataset.filter;
      applyListFilter(list);
    });
  });

  document.querySelectorAll('select[data-filter-list]').forEach(select => {
    const list = document.getElementById(select.dataset.filterList);
    if (!list) return;
    select.addEventListener('change', () => {
      list.dataset.filter = select.value;
      applyListFilter(list);
    });
  });

  document.querySelectorAll('input[data-search-for]').forEach(input => {
    const list = document.getElementById(input.dataset.searchFor);
    if (!list) return;
    const update = () => {
      list.dataset.query = input.value.trim();
      applyListFilter(list);
    };
    input.addEventListener('input', update);
    input.addEventListener('keydown', e => {
      if (e.key === 'Escape') { input.value = ''; update(); }
    });
    const clear = document.querySelector(`[data-empty-for="${list.id}"] .search-clear`);
    if (clear) clear.addEventListener('click', () => { input.value = ''; update(); input.focus(); });
    if (input.value) update(); // the browser may restore a typed query on back/forward
  });
}

// ----- Scroll reveal -----
function initReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) { els.forEach(el => el.classList.add('in')); return; }
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('in'); io.unobserve(entry.target); }
    });
  }, { threshold: 0.08 });
  els.forEach(el => io.observe(el));
}

// =====================================================================
// Chat assistant — answers in my own voice.
// Runs entirely in the browser: intent scoring with typo tolerance,
// entity recognition (projects & papers), follow-ups ("link?", "tell me
// more", "what did you use?"), yes/no replies, and session memory.
// =====================================================================

const EMAIL = 'maleksarkerlimon7@gmail.com';
const LINKS = {
  github: 'https://github.com/Limon-7',
  linkedin: 'https://www.linkedin.com/in/limon7/',
  orcid: 'https://orcid.org/0009-0003-2751-4802',
  medium: 'https://medium.com/@mslimon0007'
};
const gh = repo => `${LINKS.github}/${repo}`;

// ---- Knowledge: projects & papers ----
const entities = [
  {
    id: 'grpo', kind: 'project', name: 'GRPO from Scratch',
    aliases: ['grpo', 'grader', 'leniency', 'lenient', 'reward hacking', 'specification gaming', 'gsm8k', 'policy gradient', 'reinforcement learning project', 'rl project', 'format bonus', 'qwen'],
    summary: `GRPO from Scratch asks what a language model learns when the grader that gives its reward is more lenient than the real objective. I implemented GRPO myself and fine-tuned Qwen2.5-0.5B on GSM8K four times, changing only the reward grader, then scored every model with the strict grader.`,
    detail: `Trained on the strict grader, test accuracy rose from 9.1% to 52.3%. Trained on the lenient graders, the model got better at the arithmetic but stopped writing the required answer tag, so its strict accuracy fell to about 0%. A small format bonus was the worst: within ten steps the model stopped reasoning and wrote only a tag with a guessed number, about 9 tokens long. It's one seed per condition, so small differences need confirming.`,
    tech: ['my own GRPO implementation in PyTorch', 'LoRA (rank 32) through PEFT', 'Qwen2.5-0.5B-Instruct', 'GSM8K', 'four rule-based graders with unit tests'],
    link: gh('grpo-grader-leniency')
  },
  {
    id: 'mmsid', kind: 'project', name: 'Multimodal Semantic IDs',
    aliases: ['semantic id', 'semantic ids', 'multimodal semantic', 'mm-semantic-ids', 'mmsid', 'generative recommendation', 'generative recommender', 'generative retrieval', 'tiger', 'rq-vae', 'rqvae', 'sasrec', 'amazon reviews', 'late fusion', 'early fusion', 'siglip'],
    summary: `Multimodal Semantic IDs is my generative recommender. Every product gets a short code learned from its text and image, and a transformer generates the code of the next product a user will buy. I used it to test whether adding images to the codes helps, compared with the text-only codes of TIGER.`,
    detail: `On Amazon Reviews 2023, late fusion (text on the first two tokens, image on the next two) beat text-only codes in all four settings, for example NDCG@10 from 0.0294 to 0.0332 on Video_Games. Early fusion did not help, so how you fuse mattered more than whether you use an image. Two results went against me: no generative model retrieved a single cold item, and a plain SASRec fed the same embeddings beat every generative model.`,
    tech: ['Sentence-T5 and SigLIP embeddings', 'an RQ-VAE tokeniser', 'a small T5-style encoder-decoder', 'constrained beam search over a trie', 'SASRec baselines', 'a paired bootstrap for significance'],
    link: gh('mm-semantic-ids')
  },
  {
    id: 'mri', kind: 'project', name: 'Brain Tumor Detection in MRI',
    aliases: ['brain tumor', 'brain tumour', 'tumor', 'tumour', 'mri', 'yolo', 'yolov8', 'detr', 'medical imaging', 'glioma', 'detector comparison'],
    summary: `In Brain Tumor Detection in MRI I compared three kinds of detector, YOLOv8m, Faster R-CNN and DETR, on 5,249 MRI slices with four classes, all under one data pipeline and one COCO evaluation.`,
    detail: `YOLOv8m reached 0.781 mAP@0.5:0.95, against 0.562 for Faster R-CNN and 0.508 for DETR. The interesting part is the breakdown: Faster R-CNN is close to YOLOv8 at IoU 0.5 (0.927 against 0.963) and far behind at IoU 0.75, so it finds the tumors but draws loose boxes.`,
    tech: ['Ultralytics YOLOv8', 'Detectron2 Faster R-CNN', 'Hugging Face DETR with PyTorch Lightning', 'pycocotools', 'Weights & Biases'],
    link: 'https://github.com/mksl49/brain-tumor-detection-MRI'
  },
  {
    id: 'sra', kind: 'project', name: 'Smart Research Assistant',
    aliases: ['smart research assistant', 'research assistant', 'smart-research-assistant', 'chromadb', 'chroma', 'local rag', 'rag project', 'citation filter', 'chunking'],
    summary: `Smart Research Assistant is a fully local RAG system that answers questions over a folder of research papers and lists the source files and similarity scores behind every answer.`,
    detail: `I built it from separate components instead of a framework so that I understood each stage. The part I spent most time on is chunk quality: academic PDFs end in long reference lists that match many queries and explain nothing, so the chunker measures citation-pattern density and drops those chunks before indexing. A retrieval benchmark is the next step.`,
    tech: ['PyPDF2', 'all-MiniLM-L6-v2 embeddings', 'ChromaDB with cosine similarity', 'Llama 3.2 through Ollama'],
    link: 'https://github.com/mksl49/smart-research-assistant'
  },
  {
    id: 'voc', kind: 'project', name: 'PASCAL VOC detection',
    aliases: ['pascal', 'voc', 'faster r-cnn', 'faster rcnn', 'object detection'],
    summary: `An earlier project: I fine-tuned a COCO-pretrained Faster R-CNN with a ResNet-50 backbone on PASCAL VOC 2012, with a new head for the 20 VOC classes.`,
    tech: ['PyTorch', 'Faster R-CNN', 'OpenCV', 'Streamlit'],
  },
  {
    id: 'cifar', kind: 'project', name: 'CIFAR-10 classification',
    aliases: ['cifar', 'cifar-10', 'cifar10', 'image classification'],
    summary: `An earlier project: a custom convolutional network written with the Keras functional API and trained on CIFAR-10.`,
    tech: ['Keras', 'TensorFlow', 'Streamlit']
  },
  {
    id: 'charlm', kind: 'project', name: 'the character-level language model',
    aliases: ['char level', 'character-level', 'character level', 'char-level', 'rnn'],
    summary: `An earlier project: a recurrent network trained to predict the next character, which then generates text in the style of its training data.`,
    tech: ['Python', 'NumPy', 'an RNN', 'Streamlit']
  },
  {
    id: 'microservice', kind: 'project', name: 'Microservice',
    aliases: ['microservice', 'microservices', 'cloud-native'],
    summary: `Microservice is a microservices architecture I built on .NET Core for cloud-native applications.`,
    tech: ['.NET Core', 'C#'],
    link: gh('Microservice')
  },
  {
    id: 'cqrs', kind: 'project', name: 'the Mediator CQRS boilerplate',
    aliases: ['mediator', 'cqrs', 'boilerplate'],
    summary: `It's a boilerplate for the mediator design pattern in ASP.NET Core, with custom middleware that handles responses in one place.`,
    tech: ['ASP.NET Core', 'the mediator pattern', 'CQRS'],
    link: gh('Mediator-CQRS-boilerplate')
  },
  {
    id: 'sse', kind: 'project', name: 'the Server-Sent Events project',
    aliases: ['server-sent', 'server sent', 'sse', 'push notification'],
    summary: `It shows real-time push notifications in ASP.NET Core using Server-Sent Events.`,
    tech: ['ASP.NET Core', 'Server-Sent Events'],
    link: gh('Server-Sent-Event')
  },
  {
    id: 'chatapp', kind: 'project', name: 'the online chat application',
    aliases: ['signalr', 'chat application', 'chat app', 'online chat'],
    summary: `It's a one-to-one chat application with registration, login and message history.`,
    tech: ['Angular', 'ASP.NET Core', 'SignalR', 'SQL Server'],
    link: gh('SignalRChat')
  },
  {
    id: 'fingerprint', kind: 'paper', name: 'the fingerprint paper',
    aliases: ['fingerprint', 'socofing', 'blur', 'alteration', 'image and vision computing', 'ivc'],
    summary: `That's "Blur Sensitivity and Generator Dependence of Fingerprint Alteration Detectors Trained on SOCOFing," written with M. K. S. Likhon. Detectors reach 0.996–0.998 macro-F1 on SOCOFing, but a one-pixel blur makes eight of nine image models call 93–97% of genuine prints altered.`,
    detail: `The same alteration types from an independent generator are mostly missed (macro-F1 0.38–0.42). Blur-augmented training cuts the false alarms from 94% to 3% but does not close the generator gap.`,
    status: `It's a manuscript prepared for Image and Vision Computing (Elsevier), 2026.`,
    tech: ['blur and perturbation tests', 'a second alteration generator', 'the SOCOFing benchmark']
  },
  {
    id: 'peerhub', kind: 'paper', name: 'the earthquake damage paper',
    aliases: ['earthquake', 'damage', 'peer hub', 'phi-net', 'data audit', 'duplicate', 'structural'],
    summary: `That's "Data Audit and Revised Baselines for Structural Damage-Type Classification on PEER Hub ImageNet," written with M. K. S. Likhon. The audit found 91 near-duplicate training pairs, 30 with conflicting labels, and 23 test images with a near-copy in the training set.`,
    detail: `Under duplicate-aware cross-validation with no tuning on the test set, an ensemble of current image models reaches 77.4% test accuracy, against 72.4% for the best published result on the official split.`,
    status: `It's a manuscript in preparation (2026).`,
    tech: ['near-duplicate search', 'duplicate-aware cross-validation', 'model ensembling']
  }
];

// ---- Knowledge: general topics ----
const topics = [
  { id: 'hello', social: "Hi!",
    keys: ['hi', 'hello', 'hey', 'hiya', 'salam', 'assalamu alaikum', 'good morning', 'good afternoon', 'good evening', 'greetings'],
    reply: [`Hey! 👋 What would you like to know: my research, projects, or something else?`,
            `Hi there! Ask me anything about my work. Research, projects, and papers are good places to start.`],
    next: ['What do you research?', 'Show me your projects', 'Tell me about your papers'] },

  { id: 'howareyou', social: "I'm doing well, thanks!",
    keys: ['how are you', 'how r u', 'how is it going', "how's it going", 'whats up', "what's up", 'how do you do'],
    reply: `I'm doing well, thanks for asking! Busy with experiments, as usual. What can I tell you about?`,
    next: ['What are you working on?', 'Show me your projects'] },

  { id: 'bot',
    keys: ['are you a bot', 'are you real', 'are you human', 'are you ai', 'is this ai', 'chatgpt', 'real person', 'automated', 'who made this', 'is this really you', 'am i talking to'],
    reply: `Fair question! This is a small automated assistant that answers with replies I wrote myself. It runs entirely in your browser, so it can't look things up or remember you after you leave. For a real conversation, email me at ${EMAIL} and I'll reply personally.`,
    next: ['How can I contact you?', 'What do you research?'] },

  { id: 'help',
    keys: ['help', 'what can you', 'what can i ask', 'what should i ask', 'options', 'menu'],
    reply: `You can ask me about my research interests, any of my projects (GRPO from Scratch, Multimodal Semantic IDs, Brain Tumor Detection…), my papers, my work at Brac IT Services, my skills, my education, or how to get in touch. Follow-ups work too, like "what did you use to build it?" or "link?"`,
    next: ['What do you research?', 'Show me your projects', 'Tell me about your papers'] },

  { id: 'who',
    keys: ['who are you', 'about yourself', 'introduce yourself', 'your background', 'who is malek', 'tell me about yourself', 'who is limon', 'about malek', 'about limon'],
    reply: `I'm Md Malek Sarker, a senior software engineer in R&D at Brac IT Services in Dhaka, Bangladesh. I work on agentic AI, large language models and retrieval-augmented generation, and in my own research I study what models actually learn from the signal they are trained on. I'm open to research collaborations.`,
    more: `Before Brac IT Services I spent close to four years at CholPori, an online learning platform, building recommendation and context-aware content delivery systems. I did my B.Sc. in Computer Science and Engineering at IUBAT.`,
    next: ['Tell me more', 'What do you research?', 'Where do you work?'] },

  { id: 'research',
    keys: ['research', 'interest', 'interests', 'focus', 'area', 'areas', 'working on', 'field', 'topics'],
    reply: `Reinforcement learning for language models, recommender systems and generative retrieval, LLM agents and retrieval-augmented generation, evaluation, and computer vision. One question runs through all of it: when a model is optimised for a proxy, what does it learn in place of the task?`,
    more: `Concretely, I trained one language model under four reward graders to see what a lenient grader teaches it, and I tested whether product images improve the semantic IDs of a generative recommender. In both I report the results that went against my hypotheses as plainly as the ones that supported them.`,
    next: ['Tell me more', 'GRPO from Scratch?', 'Multimodal Semantic IDs?'] },

  { id: 'collab',
    keys: ['collaborat', 'work together', 'work with you', 'open to', 'opportunit', 'phd', 'graduate', 'masters', 'grad school', 'supervisor', 'professor', 'hire', 'hiring', 'recruit', 'available'],
    reply: `Yes, I'm open to research collaborations, especially on reinforcement learning for language models, recommendation and evaluation. If you have something in mind, email me at ${EMAIL} with a short note about the project and I'll get back to you.`,
    next: ['What do you research?', 'Can I see your CV?'] },

  { id: 'papers',
    keys: ['paper', 'papers', 'publication', 'publications', 'manuscript', 'manuscripts', 'publish', 'journal', 'preprint', 'article'],
    reply: `I have two manuscripts, both written with M. K. S. Likhon. One shows that fingerprint alteration detectors with near-perfect scores fail under a one-pixel blur. The other is a data audit of the PEER Hub ImageNet damage-type task, with revised baselines.`,
    more: `Both check what a benchmark score really means. The fingerprint detectors react to the smoothness left by the tool that made the benchmark, and the damage benchmark contains near-duplicates with conflicting labels. Ask me about either one by name!`,
    next: ['The fingerprint paper?', 'The earthquake paper?'] },

  { id: 'job',
    keys: ['brac', 'bits', 'job', 'work', 'company', 'experience', 'industry', 'employer', 'current role', 'day job', 'cholpori', 'infonet', 'career'],
    reply: `I've been a senior software engineer in R&D at Brac IT Services since May 2025, working on agentic AI, LLMs and RAG. That includes LLM-based code generation that retrieves the company's own architectural patterns, so the generated code follows them.`,
    more: `Before that I was a software engineer at CholPori Technologies (2021 to 2025), where I built data pipelines for a personalised educational recommender, and briefly at Infonet Associates, where I worked on big data analytics and was Best Employee of the Month in July 2021.`,
    next: ['Tell me more', 'What tools do you use?', 'What do you research?'] },

  { id: 'recsys',
    keys: ['recommend', 'recommender', 'recommendation', 'recsys', 'retrieval'],
    reply: `Recommendation is where my industry and research work meet. At CholPori I built pipelines for an educational recommender, and on my own I built a generative recommender to test whether product images improve semantic IDs.`,
    next: ['Multimodal Semantic IDs?', 'Where do you work?'] },

  { id: 'llm',
    keys: ['llm', 'llms', 'language model', 'language models', 'rag', 'grounding', 'grounded', 'hallucinat', 'agent', 'agents', 'agentic', 'reinforcement', 'fine-tuning', 'fine tuning', 'lora'],
    reply: `I work with LLMs from two sides. At work I build agentic and RAG systems. In my own research I fine-tune a small model with reinforcement learning and watch what the reward teaches it: in GRPO from Scratch, a lenient grader took strict accuracy to about 0%.`,
    more: `I also built Smart Research Assistant, a fully local RAG system over research papers that keeps reference lists out of the index and shows its sources with every answer.`,
    next: ['Tell me more', 'GRPO from Scratch?', 'Smart Research Assistant?'] },

  { id: 'vision',
    keys: ['vision', 'computer vision', 'image', 'images', 'detection'],
    reply: `On the vision side I compared YOLOv8, Faster R-CNN and DETR for brain tumor detection in MRI, and I'm a co-author on two manuscripts about what image benchmarks really measure.`,
    next: ['Brain Tumor Detection?', 'Tell me about your papers'] },

  { id: 'projects',
    keys: ['project', 'projects', 'built', 'portfolio', 'what have you made', 'side project', 'showcase', 'what have you built'],
    reply: `Four research projects: GRPO from Scratch (what a lenient reward grader teaches a language model), Multimodal Semantic IDs (do images improve a generative recommender?), Brain Tumor Detection in MRI (three detectors, one evaluation) and Smart Research Assistant (local RAG over papers). There are also earlier ML projects and open-source .NET work. Ask about any of them by name!`,
    next: ['GRPO from Scratch?', 'Multimodal Semantic IDs?', 'Brain Tumor Detection?', 'Smart Research Assistant?'] },

  { id: 'skills',
    keys: ['skill', 'skills', 'stack', 'tools', 'framework', 'frameworks', 'tech stack', 'technologies', 'pytorch', 'programming language', 'coding language', 'dotnet', '.net', 'python'],
    reply: `For ML, mostly PyTorch with Hugging Face Transformers, PEFT, LangGraph, sentence-transformers, Detectron2 and Ultralytics. For engineering: Python, C#, C/C++, JavaScript and SQL, with .NET Core, Angular, React, RabbitMQ, PostgreSQL, MongoDB, ChromaDB, Docker and Git.`,
    next: ['Show me your projects', 'Where do you work?'] },

  { id: 'education',
    keys: ['education', 'educat', 'degree', 'university', 'iubat', 'bsc', 'b.sc', 'undergrad', 'bachelor', 'studied', 'college'],
    reply: `I did my B.Sc. in Computer Science and Engineering at the International University of Business Agriculture and Technology (IUBAT) in Dhaka, finishing in 2018. My final-year project was an Enterprise Resource Planning system.`,
    next: ['What do you research?', 'Where do you work?'] },

  { id: 'gpa',
    keys: ['cgpa', 'gpa', 'grades'],
    reply: `My CGPA was 3.20 out of 4.00. It's listed on my CV as well.`,
    next: ['What do you research?', 'Can I see your CV?'] },

  { id: 'cv',
    keys: ['cv', 'resume', 'résumé', 'curriculum vitae'],
    reply: `Sure! There's a CV button at the top of every page, and the experience page has the longer version: experience.html`,
    next: ['Are you open to collaboration?', 'How can I contact you?'] },

  { id: 'writing',
    keys: ['blog', 'writing', 'medium', 'post', 'posts', 'factory', 'design pattern', 'design patterns'],
    reply: `I write on Medium now and then. The post listed here is on the factory method design pattern in C#, with an ASP.NET Core example: ${LINKS.medium}`,
    next: ['Show me your projects', 'What tools do you use?'] },

  { id: 'location',
    keys: ['where are you', 'where do you live', 'location', 'located', 'which country', 'bangladesh', 'dhaka', 'time zone', 'timezone'],
    reply: `I'm based in Dhaka, Bangladesh.`,
    next: ['How can I contact you?', 'Where do you work?'] },

  { id: 'languages',
    keys: ['speak', 'spoken', 'bengali', 'bangla', 'english'],
    reply: `I speak Bangla natively and English at a fluent working level.`,
    next: ['What do you research?'] },

  { id: 'awards',
    keys: ['award', 'awards', 'honor', 'honors', 'honour', 'achievement', 'achievements'],
    reply: `I was Best Employee of the Month at Infonet Associates in July 2021. At university I volunteered at the IUBAT programming contest.`,
    next: ['Where do you work?', 'Education?'] },

  { id: 'news',
    keys: ['news', 'latest', 'recent', 'update', 'updates', 'lately', 'currently'],
    reply: `Most recently I finished two research projects, GRPO from Scratch and Multimodal Semantic IDs, and I'm working on two manuscripts. I joined Brac IT Services in May 2025.`,
    next: ['GRPO from Scratch?', 'Tell me about your papers'] },

  { id: 'contact',
    keys: ['contact', 'email', 'e-mail', 'reach', 'mail', 'linkedin', 'orcid', 'connect', 'get in touch', 'talk to you', 'message you', 'github profile'],
    reply: `Email is best: ${EMAIL}. You can also find me on LinkedIn (${LINKS.linkedin}), GitHub (${LINKS.github}), and ORCID (${LINKS.orcid}).`,
    next: ['Are you open to collaboration?', 'Can I see your CV?'] },

  { id: 'private',
    keys: ['age', 'how old', 'married', 'salary', 'religion', 'girlfriend', 'wife'],
    reply: `I'd rather keep this chat about my work 🙂 Happy to talk research, projects, or papers.`,
    next: ['What do you research?', 'Show me your projects'] },

  { id: 'thanks', social: 'Thanks!',
    keys: ['thank', 'thanks', 'thx', 'ty', 'appreciate', 'great', 'awesome', 'cool', 'nice', 'perfect', 'helpful'],
    reply: [`Glad that helped! Anything else?`, `Happy to help. Anything else you're curious about?`],
    next: ['Show me your projects', 'How can I contact you?'] },

  { id: 'bye',
    keys: ['bye', 'goodbye', 'see you', 'see ya', 'cya', 'take care', 'good night'],
    reply: `Thanks for stopping by! If you want to talk research, I'm at ${EMAIL}. 👋`,
    next: [] }
];

const attributes = [
  { id: 'link', keys: ['link', 'github', 'repo', 'repository', 'source code', 'code', 'url', 'where can i see', 'where can i find', 'open source'] },
  { id: 'tech', keys: ['tech', 'stack', 'built with', 'build it', 'tools', 'framework', 'library', 'libraries', 'what did you use', 'use', 'used', 'methods', 'method', 'models'] },
  { id: 'status', keys: ['status', 'published', 'accepted', 'under review', 'submitted', 'venue', 'where is it'] },
  { id: 'detail', keys: ['how does', 'how did', 'how it works', 'works', 'explain', 'detail', 'details', 'more', 'elaborate', 'deeper', 'why'] }
];

const DEFAULT_NEXT = ['What do you research?', 'Show me your projects', 'Tell me about your papers', 'How can I contact you?'];
const SOCIAL = ['hello', 'howareyou', 'thanks'];

// ---- Text utilities ----
const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const normalize = s => s.toLowerCase().replace(/[’‘`]/g, "'").replace(/[^a-z0-9+→.'\-\s]/g, ' ').replace(/\s+/g, ' ').trim();
const pick = r => Array.isArray(r) ? r[Math.floor(Math.random() * r.length)] : r;
const joinList = arr => arr.length < 2 ? arr.join('') : arr.slice(0, -1).join(', ') + ' and ' + arr[arr.length - 1];

function hasKey(text, key) {
  const k = escRe(key);
  // Short single words must match as whole words (optionally plural); longer keys may be prefixes.
  const re = key.length <= 4 && !key.includes(' ')
    ? new RegExp(`(^|[^a-z0-9])${k}s?($|[^a-z0-9])`)
    : new RegExp(`(^|[^a-z0-9])${k}`);
  return re.test(text);
}

function levenshtein(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      rowMin = Math.min(rowMin, cur[j]);
    }
    if (rowMin > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

const STOP = new Set(['what', 'your', 'about', 'with', 'have', 'that', 'this', 'there', 'their', 'where', 'when', 'which', 'would', 'could', 'should', 'from', 'they', 'them', 'then', 'than', 'does', 'doing', 'done', 'tell', 'like', 'know', 'want', 'give', 'show', 'some', 'other', 'much', 'many', 'very', 'just', 'also', 'been', 'were', 'will', 'into', 'only', 'over', 'such', 'here', 'please', 'make', 'made', 'more', 'good', 'well', 'really', 'thing', 'things', 'about', 'these', 'those', 'being']);

const VOCAB = (() => {
  const words = new Set();
  const add = phrase => phrase.split(/[\s\-_]+/).forEach(w => { if (/^[a-z]{4,}$/.test(w)) words.add(w); });
  topics.forEach(t => t.keys.forEach(add));
  entities.forEach(e => e.aliases.forEach(add));
  attributes.forEach(a => a.keys.forEach(add));
  return [...words];
})();

function correctTypos(text) {
  return text.split(' ').map(tok => {
    if (tok.length < 4 || !/^[a-z]+$/.test(tok) || STOP.has(tok) || VOCAB.includes(tok)) return tok;
    const max = tok.length >= 7 ? 2 : 1;
    let best = null, bestD = max + 1;
    for (const w of VOCAB) {
      if (w[0] !== tok[0]) continue;
      const d = levenshtein(tok, w, max);
      if (d < bestD) { best = w; bestD = d; }
    }
    return best || tok;
  }).join(' ');
}

// ---- Agent ----
function createAgent() {
  const state = { entity: null, topic: null, moreUsed: false, pending: null, name: null };

  const findEntity = text => {
    let best = null;
    for (const e of entities) {
      for (const a of e.aliases) {
        if (hasKey(text, a) && (!best || a.length > best.alias.length)) best = { e, alias: a };
      }
    }
    if (!best) return null;
    return { e: best.e, rest: text.replace(new RegExp(escRe(best.alias), 'g'), ' ') };
  };

  const findAttr = text => {
    let best = null, bestLen = 0;
    for (const a of attributes) {
      for (const k of a.keys) if (hasKey(text, k) && k.length > bestLen) { best = a.id; bestLen = k.length; }
    }
    return best;
  };

  const rankTopics = text => topics
    .map(t => ({ t, s: t.keys.reduce((sum, k) => sum + (hasKey(text, k) ? k.length : 0), 0) }))
    .filter(x => x.s >= 2)
    .sort((a, b) => b.s - a.s);

  const entityNext = e => [
    ...(e.detail ? ['Tell me more'] : []),
    ...(e.kind === 'paper' ? (e.status ? ["What's its status?"] : []) : (e.tech ? ['What did you use to build it?'] : [])),
    ...(e.link ? ['Link?'] : []),
    e.kind === 'paper' ? 'Other papers?' : 'Other projects?'
  ].slice(0, 4);

  function answerEntity(e, attr) {
    state.entity = e; state.topic = null;
    const next = entityNext(e);
    switch (attr) {
      case 'link':
        return e.link
          ? { text: `Here's the code for ${e.name}: ${e.link}`, next: next.filter(n => n !== 'Link?') }
          : { text: e.kind === 'paper'
                ? `${e.name} isn't public yet. ${e.status || ''} Happy to share more over email: ${EMAIL}.`
                : `${e.name} doesn't have a public repo, but I'm happy to talk about it. Email me at ${EMAIL}.`, next };
      case 'tech':
        return e.tech
          ? { text: `For ${e.name}, I used ${joinList(e.tech)}.`, next: next.filter(n => n !== 'What did you use to build it?') }
          : { text: `I haven't written up the details for ${e.name} here yet. The repo is the best place to look: ${e.link}`, next };
      case 'status':
        return { text: e.status || `${e.name} is a project rather than a paper${e.link ? `, and it's open source on GitHub: ${e.link}` : '.'}`, next: next.filter(n => n !== "What's its status?") };
      case 'detail':
        if (e.detail) return { text: e.detail, next: next.filter(n => n !== 'Tell me more') };
        return { text: `That's the main idea! ${e.link ? `The repo has the full details: ${e.link}` : `Happy to go deeper over email: ${EMAIL}.`}`, next };
      default: {
        let text = e.summary;
        if (e.kind === 'paper' && e.status) text += ' ' + e.status;
        if (e.link) {
          text += ' Want the GitHub link?';
          state.pending = () => answerEntity(e, 'link');
        }
        return { text, next };
      }
    }
  }

  function answerTopic(t) {
    state.topic = t; state.entity = null; state.moreUsed = false;
    const next = t.more ? t.next : t.next.filter(n => n !== 'Tell me more');
    return { text: pick(t.reply), next };
  }

  return function respond(raw) {
    const original = raw.slice(0, 400);
    let text = correctTypos(normalize(original));
    if (!text) return { text: `Could you type that again? I didn't catch anything.`, next: DEFAULT_NEXT };

    // Yes / no to a question I just asked
    if (state.pending) {
      const pending = state.pending;
      state.pending = null;
      if (/^(y|yes|yeah|yep|yup|sure|ok|okay|please|yes please|go ahead|of course|definitely)\b/.test(text)) return pending();
      if (/^(no|nope|nah|not now|no thanks|maybe later)\b/.test(text)) return { text: `No problem! Anything else you'd like to know?`, next: DEFAULT_NEXT };
    }

    // Visitor introduces themselves
    let greetName = null;
    const nameMatch = original.match(/\b(?:my name is|i am|i'm|im|this is)\s+([A-Za-z]{2,})/i);
    const notNames = ['a', 'an', 'the', 'looking', 'interested', 'from', 'working', 'curious', 'here', 'just', 'not', 'good', 'fine', 'doing', 'trying', 'professor', 'student', 'researcher', 'recruiter', 'wondering', 'new', 'very', 'so', 'also', 'really', 'on', 'in', 'at', 'with', 'great', 'awesome', 'cool', 'nice', 'amazing', 'helpful', 'interesting', 'impressive', 'sure', 'okay', 'glad', 'happy', 'sorry', 'back', 'done', 'confused', 'impressed'];
    if (nameMatch && !notNames.includes(nameMatch[1].toLowerCase()) && /my name is|this is/i.test(nameMatch[0]) || (nameMatch && /^[A-Z]/.test(nameMatch[1]) && !notNames.includes(nameMatch[1].toLowerCase()))) {
      state.name = nameMatch[1][0].toUpperCase() + nameMatch[1].slice(1).toLowerCase();
      greetName = state.name;
      text = normalize(original.replace(nameMatch[0], ' '));
    }

    const ent = findEntity(text);
    const attr = findAttr(ent ? ent.rest : text);
    const ranked = rankTopics(text);
    const top = ranked[0];
    const withName = res => greetName ? { ...res, text: `Nice to meet you, ${greetName}! ${res.text}` } : res;

    // 1. A specific project or paper
    if (ent) return withName(answerEntity(ent.e, attr));

    // 2. Follow-up about the project/paper we were just discussing ("link?", "what did you use?")
    const wordCount = text.split(' ').length;
    const refersBack = /(^|\s)(it|its|it's|that|this|them|those|the project|the paper)(\s|$|\?)/.test(text) || wordCount <= 4;
    if (attr && state.entity && refersBack && (!top || top.s < 6 || attr === 'link')) {
      return withName(answerEntity(state.entity, attr));
    }

    // 3. "Tell me more" about the last topic
    const wantsMore = /^(tell me more|more|go on|continue|elaborate|and|more details?|details?|explain more|say more)\b/.test(text) || text.includes('tell me more');
    if (wantsMore && (!top || top.t.id === (state.topic && state.topic.id))) {
      if (state.topic && state.topic.more && !state.moreUsed) {
        state.moreUsed = true;
        return { text: state.topic.more, next: state.topic.next.filter(n => n !== 'Tell me more') };
      }
      return { text: `That's pretty much the short version! My CV has the full details, and I'm always happy to go deeper over email at ${EMAIL}.`, next: DEFAULT_NEXT };
    }

    // 4. General topics
    if (top) {
      let primary = top.t;
      let prefix = '';
      const substantive = ranked.find(r => !SOCIAL.includes(r.t.id));
      if (SOCIAL.includes(primary.id) && substantive) {
        prefix = (greetName ? '' : primary.social + ' ');
        primary = substantive.t;
      }
      const res = answerTopic(primary);
      res.text = prefix + res.text;

      // Two distinct questions in one message ("research and projects")
      const second = ranked.find(r => r.t !== primary && !SOCIAL.includes(r.t.id) && r.t.id !== 'bot');
      if (second && /\band\b|&|,|\balso\b/.test(text) && !SOCIAL.includes(primary.id)) {
        res.text += '\n\n' + pick(second.t.reply);
      }
      return withName(res);
    }

    if (greetName) return { text: `Nice to meet you, ${greetName}! What would you like to know about my work?`, next: DEFAULT_NEXT };

    // 5. Fallback
    state.topic = null;
    return {
      text: `Hmm, I'm not sure how to answer that one. I can tell you about my research, projects, papers, or background. Or email me at ${EMAIL} and I'll reply personally.`,
      next: DEFAULT_NEXT
    };
  };
}

// ---- Rendering: text with clickable links ----
function renderRich(el, text) {
  const re = /(https?:\/\/[^\s)]+|[\w.+-]+@[\w-]+\.[\w.]+|\b[\w-]+\.(?:html|pdf)\b)/g;
  let last = 0, m;
  while ((m = re.exec(text))) {
    let token = m[0];
    const trail = token.match(/[.,!?]+$/);
    if (trail) token = token.slice(0, -trail[0].length);
    el.appendChild(document.createTextNode(text.slice(last, m.index)));
    const a = document.createElement('a');
    a.textContent = token;
    if (token.includes('@') && !token.startsWith('http')) a.href = 'mailto:' + token;
    else a.href = token;
    if (/^https?:|\.pdf$/.test(token)) { a.target = '_blank'; a.rel = 'noopener'; }
    el.appendChild(a);
    last = m.index + token.length;
  }
  el.appendChild(document.createTextNode(text.slice(last)));
}

function mountChat() {
  const STORE = 'malek-chat-v1';
  const widget = document.createElement('div');
  widget.className = 'chat-widget';
  widget.innerHTML = `
    <div class="chat-panel" id="chatPanel" role="dialog" aria-label="Chat with Malek" hidden>
      <div class="chat-header">
        <div class="chat-id">
          <img class="chat-avatar" src="assets/profile.jpg" alt="">
          <div>
            <h4>Chat with Malek</h4>
            <p>Automated assistant · answers written by me</p>
          </div>
        </div>
        <div class="chat-actions">
          <button class="chat-reset" type="button" aria-label="Restart chat" title="Restart chat">↺</button>
          <button class="chat-close" type="button" aria-label="Close">&times;</button>
        </div>
      </div>
      <div class="chat-messages" aria-live="polite"></div>
      <div class="quick"></div>
      <form class="chat-form">
        <input type="text" maxlength="400" aria-label="Type your message" placeholder="Ask me anything…" autocomplete="off">
        <button type="submit" aria-label="Send"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>
      </form>
    </div>
    <button class="chat-toggle" type="button" aria-label="Chat with Malek" aria-expanded="false">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg>
    </button>`;
  document.body.appendChild(widget);

  const avatar = widget.querySelector('.chat-avatar');
  avatar.addEventListener('error', () => { avatar.src = '/assets/profile.jpg'; }, { once: true });

  const panel = widget.querySelector('.chat-panel');
  const toggle = widget.querySelector('.chat-toggle');
  const messages = widget.querySelector('.chat-messages');
  const quick = widget.querySelector('.quick');
  const form = widget.querySelector('.chat-form');
  const input = form.querySelector('input');

  let respond = createAgent();
  let history = [];
  let lastNext = DEFAULT_NEXT;
  let busy = false;
  const sentLog = [];
  let logIdx = 0;

  const save = () => { try { sessionStorage.setItem(STORE, JSON.stringify({ history: history.slice(-40), lastNext })); } catch (e) {} };
  const scroll = () => { messages.scrollTop = messages.scrollHeight; };

  const add = (text, who, persist = true) => {
    const el = document.createElement('div');
    el.className = 'msg ' + who;
    if (who === 'bot') renderRich(el, text); else el.textContent = text;
    messages.appendChild(el);
    scroll();
    if (persist) { history.push({ who, text }); save(); }
  };

  const setSuggestions = list => {
    lastNext = list;
    quick.innerHTML = '';
    list.forEach(label => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.addEventListener('click', () => ask(label));
      quick.appendChild(b);
    });
    save();
  };

  const botSay = (text, next) => {
    busy = true;
    quick.innerHTML = '';
    const typing = document.createElement('div');
    typing.className = 'msg bot typing';
    typing.setAttribute('aria-label', 'Malek is typing');
    typing.innerHTML = '<span></span><span></span><span></span>';
    messages.appendChild(typing);
    scroll();
    setTimeout(() => {
      typing.remove();
      add(text, 'bot');
      setSuggestions(next || []);
      busy = false;
      input.focus();
    }, Math.min(1500, 400 + text.length * 3));
  };

  function ask(q) {
    q = q.trim();
    if (!q || busy) return;
    add(q, 'user');
    sentLog.push(q); logIdx = sentLog.length;
    const { text, next } = respond(q);
    botSay(text, next);
  }

  const greet = () => botSay(`Hi, I'm Malek 👋 Ask me about my research, projects, or papers. You can also ask follow-ups like "link?" or "what did you use to build it?"`, DEFAULT_NEXT);

  // Restore this tab's conversation across pages
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORE) || 'null');
    if (saved && saved.history && saved.history.length) {
      history = saved.history;
      history.forEach(m => add(m.text, m.who, false));
      setSuggestions(saved.lastNext || DEFAULT_NEXT);
    }
  } catch (e) {}

  const setOpen = open => {
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    if (open) {
      input.focus();
      if (!history.length && !busy) greet();
      scroll();
    }
  };

  toggle.addEventListener('click', () => setOpen(panel.hidden));
  widget.querySelector('.chat-close').addEventListener('click', () => setOpen(false));
  widget.querySelector('.chat-reset').addEventListener('click', () => {
    if (busy) return;
    history = []; messages.innerHTML = ''; respond = createAgent();
    try { sessionStorage.removeItem(STORE); } catch (e) {}
    greet();
  });
  form.addEventListener('submit', e => { e.preventDefault(); ask(input.value); input.value = ''; });
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowUp' && sentLog.length && logIdx > 0) { logIdx--; input.value = sentLog[logIdx]; e.preventDefault(); }
    if (e.key === 'ArrowDown' && logIdx < sentLog.length) { logIdx++; input.value = sentLog[logIdx] || ''; e.preventDefault(); }
  });

  document.addEventListener('mousedown', e => {
    if (!panel.hidden && !widget.contains(e.target)) setOpen(false);
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !panel.hidden) { setOpen(false); toggle.focus(); }
  });
}

// ----- Init -----
document.addEventListener('DOMContentLoaded', () => {
  setTheme(document.documentElement.getAttribute('data-theme') || 'light');
  document.querySelectorAll('.theme-toggle').forEach(btn => btn.addEventListener('click', toggleTheme));
  const menuBtn = document.querySelector('.menu-btn');
  if (menuBtn) menuBtn.addEventListener('click', toggleMenu);
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
  initFilters();
  initReveal();
  mountChat();
});
