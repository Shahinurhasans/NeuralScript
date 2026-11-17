---
title: 'Train Your Own SLM: The Future of Modern AI Infrastructure'
description: 'Part 1 of a practical series on building a Small Language Model (SLM) from scratch: what SLMs are, why they matter alongside frontier LLMs, and how to curate, tokenize, and memory-map a dataset for training.'
date: 2026-11-17
tags: [slm, llm, deep-learning, ai-infrastructure]
draft: true
---

Welcome to the beginning of a brand-new series: **Train Your Own SLM**.

In my previous series on adversarial machine learning ([Part 1](/posts/adversarial-ml-part-1/) and [Part 2](/posts/adversarial-ml-part-2/)), we explored how machine learning models can be fooled by subtle input perturbations—and what it costs to defend them. In this series, we take one step closer to the foundation of modern AI itself. Instead of treating a language model as a black-box API, we will design, pre-process, train, evaluate, and improve our own **Small Language Model (SLM)** completely from scratch.

The final objective of this project is concrete: we will build and train a **15-to-30-million-parameter** decoder-only Transformer on a curated collection of short stories for three-to-four-year-old children—the *TinyStories* dataset [1]—until it can generate coherent, grammatically sound English stories on a single machine.

> [!IMPORTANT] What this series is (and is not)
> This is **not** an attempt to build a competitor to frontier chat models like ChatGPT or Gemini—doing so requires thousands of GPUs and trillions of tokens. Instead, our goal is far more practical for an engineer or researcher: **to demystify how language models actually work by building one small enough to train, inspect, debug, and run on your own computer.**

---

## 1. What is an SLM?

**SLM** stands for **Small Language Model**. It is a neural language model trained with orders of magnitude fewer parameters, a more focused dataset, and a fraction of the compute required by a frontier **Large Language Model (LLM)**.

Despite the difference in size, an SLM and an LLM share the exact same core mathematical objective: **autoregressive next-token prediction**. Given a sequence of tokens $w_1, w_2, \dots, w_{t-1}$, the model estimates a probability distribution over the vocabulary for the next token $w_t$:

$$
P(w_t \mid w_1, w_2, \dots, w_{t-1})
$$

In plain words, if we feed the model an unfinished sentence:

> *"The little boy opened the"*

the network processes those words and assigns a probability to every possible next token in its vocabulary—for example, **door** ($64\%$), **box** ($21\%$), **book** ($9\%$), or **window** ($4\%$). During training, the model sees millions of text passages and gradually adjusts its internal weights (**parameters**) so that the true next token receives a higher probability each time.

![Four stages from left to right: Input Context ("The little boy opened the ___"), Tokenizer (BPE subwords and integer IDs), Small Transformer (15M-30M parameters with embeddings, masked self-attention, and feed-forward layers), and Next-Token Probabilities ("door" 64%, "box" 21%, "book" 9%, "window" 4%)](./slm-pipeline.svg "Figure 1. How a small language model generates text: the input prompt is split into subword tokens, mapped to integer IDs, passed through a stack of Transformer decoder blocks, and converted into a probability distribution for the next token.")

An SLM follows the exact same pipeline as a massive LLM (Figure 1). What changes is **scale and scope**: rather than trying to memorize every fact on the open web, an SLM concentrates its parameter budget on mastering fluent language or a single well-defined domain.

---

## 2. If we already have LLMs, why do we need SLMs?

It is natural to ask: *if a frontier LLM can already write code, summarize research papers, translate between dozens of languages, and answer general questions, why would anyone bother training a small model?*

The short answer is that **the largest model is rarely the best engineering choice for every problem.** You do not drive a freight train to pick up groceries down the street.

### 2.1 A smaller model can stay local and private

Most frontier LLMs run inside massive cloud data centers. Every time an application uses one, it must send the user's prompt over the internet to an external server and wait for the response. An SLM, by contrast, is compact enough to run directly on a laptop, smartphone, private on-premise server, or embedded edge device.

For many organizations, **data sovereignty is non-negotiable**. Hospitals handling patient notes, factories monitoring proprietary equipment, universities managing student records, and financial teams reviewing internal audits cannot send every sensitive document to a third-party API. A local SLM keeps private data inside the organization's own network—and continues working even when an internet connection is unavailable.

### 2.2 A smaller model can be deeply specialized

A general-purpose LLM has to divide its capacity across poetry, tax law, astrophysics, trivia, and dozens of programming languages. An SLM can dedicate $100\%$ of its capacity to **one narrow job**: classifying support tickets, generating children's stories, parsing medical forms, or diagnosing a specific industrial machine.

For a focused task, a smaller model trained on clean, domain-specific data is faster, cheaper to serve, and much easier to keep on-topic. It does not need to know everything; it only needs to do one job reliably.

### 2.3 A smaller model is a glass box you can actually study

When a model has hundreds of billions of parameters, training even a single run from scratch is out of reach for individual researchers and most university labs. When we build a **15-to-30-million-parameter** model ourselves, we can inspect every piece of the system—the raw dataset, the tokenizer vocabulary, the loss curves, the attention maps, the intermediate checkpoints, and the generated stories.

That makes an SLM an extraordinary scientific laboratory. We can ask concrete questions and test them empirically:

1. **What does the model learn first?** Does it master punctuation and word boundaries before grammar, and grammar before plot coherence?
2. **How much does data quality matter?** Does cleaning duplicates and broken sentences improve story structure more than adding extra layers?
3. **How does the tokenizer shape learning?** What happens if our vocabulary is $4{,}096$ tokens versus $50{,}257$ tokens?
4. **Where is the capacity sweet spot?** What happens when the network is too shallow or too wide for its dataset?

With a frontier LLM, answering these questions through controlled retraining costs fortunes. With an SLM, we can run the experiment over a weekend and see the answer for ourselves.

---

## 3. How is an SLM different from an LLM?

There is no rigid parameter cutoff written in stone where a model suddenly stops being an SLM and becomes an LLM. The distinction is architectural and operational: an SLM is designed around **efficiency, specialization, and local deployability**, whereas an LLM is designed around **breadth, world knowledge, and general-purpose reasoning**.

| Dimension | Small Language Model (SLM) | Large Language Model (LLM) |
| :--- | :--- | :--- |
| **Primary goal** | Focused task, specific domain, or fluent language core | Broad, general-purpose knowledge and multi-task reasoning |
| **Typical scale** | Tens of millions to a few billion parameters | Tens of billions to hundreds of billions (or trillions) of parameters |
| **Training corpus** | Smaller, heavily curated, high-signal dataset | Web-scale, multi-terabyte, heterogeneous dataset |
| **Compute hardware** | A single laptop, workstation, or consumer/cloud GPU | Multi-node clusters of high-end data-center accelerators |
| **Deployment target** | On-device, edge, private server, or offline environments | Remote cloud APIs and high-memory inference clusters |
| **Core strengths** | Low latency, low cost, full data privacy, rapid iteration | Encyclopedic breadth, zero-shot flexibility, complex synthesis |
| **Main trade-off** | Limited world knowledge outside its training domain | High inference cost, network latency, and heavy infrastructure |

> [!NOTE] It is about fit, not superiority
> SLMs do not replace frontier LLMs on open-ended encyclopedic tasks. Instead, they excel where **speed, privacy, predictable behavior, and low hardware cost** matter more than knowing every topic on Earth.

---

## 4. Can an SLM outperform an LLM?

**Yes—when the evaluation matches a focused engineering constraint.**

Consider a practical industrial scenario: a manufacturing plant wants an automated system that reads sensor logs and technician notes to flag **urgent machine-maintenance alerts** in real time.

- **Using a frontier LLM:** Every log entry must be sent to a remote API or processed by a massive multi-GPU server. The model knows how to write Shakespearean sonnets and explain quantum mechanics—none of which helps classify a bearing-temperature warning—while incurring higher latency and per-token API bills.
- **Using a domain SLM:** A compact model trained on thousands of verified maintenance records runs directly on the factory's local server in milliseconds, costs almost nothing per prediction, never leaks proprietary operational data, and produces consistent outputs tailored to that exact schema.

The same principle powers our project in this series. A 20-million-parameter model trained on *TinyStories* will not know world history or Python syntax. Yet for generating **short, grammatically coherent children's stories** in the style of its training distribution, it performs remarkably well. In fact, Eldan and Li [1] demonstrated that language models with **fewer than 10 million parameters**—more than $17{,}000\times$ smaller than GPT-3's 175 billion parameters [2]—can produce fluent, consistent multi-paragraph stories with reasoning when trained on a clean, vocabulary-constrained dataset.

> [!IMPORTANT] The right engineering question
> We should never ask, **"Is an SLM smarter than an LLM?"**
> We should ask, **"Which model is best suited for this task, on this hardware, under these latency, privacy, and budget constraints?"**

---

## 5. Four Engineering Advantages of an SLM

### 5.1 Local training and complete data privacy

Because the dataset and model fit on a single machine, the entire lifecycle—downloading, cleaning, tokenizing, training, and inference—happens locally. No sensitive documents, regional-language corpora, or proprietary manuals ever leave your environment.

### 5.2 Lower compute and rapid experimentation

Training compute scales roughly with the product of model parameters and training tokens ($C \approx 6 N D$ FLOPs for a standard Transformer). Shrinking the parameter count $N$ and training on a clean, focused dataset $D$ reduces both GPU memory (VRAM) and wall-clock training time by orders of magnitude. Instead of betting everything on one expensive training run, you can test multiple learning rates, context lengths, and architectures.

### 5.3 Compact weight footprint

Let us do a quick back-of-the-envelope memory calculation. At 16-bit precision (`fp16` or `bfloat16`), each parameter occupies **2 bytes** of storage:

$$
\text{Weight Storage} = 20 \times 10^6 \text{ parameters} \times 2 \text{ bytes/parameter} \approx 40 \text{ MB}
$$

A **20-million-parameter** model requires only **~40 MB** on disk to store its weights (and roughly 30 to 60 MB across the 15M–30M range). During training, additional GPU memory is needed for gradients, AdamW optimizer states, and intermediate activations, so total training VRAM is a few gigabytes—still well within reach of a single consumer or free-tier cloud GPU. Once trained, a 40 MB checkpoint is small enough to copy in a second, commit to version control, or run on a CPU.

### 5.4 Low latency and effortless deployment

Every generated token requires a forward pass through the network's layers. Fewer parameters mean far fewer matrix multiplications per token, eliminating both heavy GPU requirements and network round-trip delays.

---

## 6. A Practical Engineering Comparison

The chart and table below provide an **illustrative engineering comparison** between the SLM we are building in this series and a typical frontier LLM. Exact training times and memory usage always depend on batch size, sequence length, hardware generation, and numeric precision.

![Horizontal comparison chart across four dimensions: Parameters (15M-30M for Our SLM vs 10B-100B+ for Frontier LLM), Weights at 16-bit (~30-60 MB vs 20-200+ GB VRAM), Training setup (1 workstation / consumer GPU vs Multi-GPU data-center cluster), and Iteration cycle (Hours vs Weeks to months)](./slm-llm-comparison.svg "Figure 2. An illustrative engineering comparison between our 15M–30M TinyStories SLM and a frontier LLM. A compact model trades broad world knowledge for dramatic reductions in storage, hardware, and iteration time.")

| Engineering Metric | Our Project SLM (*TinyStories*) | Typical Frontier LLM |
| :--- | :--- | :--- |
| **Parameter count** | $15\text{M} - 30\text{M}$ | $10\text{B} - 100\text{B}+$ |
| **Weight storage (16-bit)** | $\approx 30 - 60\text{ MB}$ | $\approx 20 - 200+\text{ GB}$ |
| **Training hardware** | 1 workstation or single GPU | Multi-node GPU/TPU data-center cluster |
| **Experiment turnaround** | Hours per training run | Weeks to months |
| **Deployment footprint** | Local laptop, edge device, or small CPU/GPU server | Distributed cloud inference servers |

---

## 7. The Master Plan: How We Will Build Our SLM

Building a language model from scratch is a systems engineering problem. Every stage feeds into the next, and a flaw in an early stage will silently cripple the model later. Our project follows a **six-stage pipeline** (Figure 3):

![Six-stage roadmap diagram. Row 1: 1. Prepare Dataset (Curate TinyStories, clean duplicates, split train/val), 2. Pre-process & Tokenize (Subword BPE encoding, pack uint16 IDs into mmap train.bin & val.bin), 3. Design Architecture (Decoder-only Transformer). Row 2: 4. Train the Model (Stream batches from disk, minimize next-token loss), 5. Validate & Generate (Track train vs val loss, generate unseen stories), 6. Evaluate & Improve (Ablate vocabulary, depth, LR, sampling). Stages 1 and 2 are highlighted as covered in Part 1.](./slm-roadmap.svg "Figure 3. The six-stage engineering roadmap for our Train Your Own SLM series. Part 1 focuses on Stages 1 and 2—building a clean, memory-mapped data and tokenization pipeline.")

1. **Prepare the dataset:** Select, inspect, and clean the *TinyStories* corpus, separating training and validation splits cleanly.
2. **Pre-process and tokenize the data:** Convert raw story strings into subword token IDs using Byte Pair Encoding (BPE) and pack them into contiguous memory-mapped binary files (`train.bin` and `val.bin`).
3. **Design the model architecture:** Configure a decoder-only Transformer—choosing the vocabulary size $V$, context length $T$, embedding dimension $d_{\text{model}}$, number of layers $L$, and attention heads $H$.
4. **Train the model:** Stream random batches of token sequences from disk into the Transformer and minimize cross-entropy next-token prediction loss.
5. **Validate and generate stories:** Monitor training versus validation loss to catch overfitting, and sample original stories from unseen prompts.
6. **Evaluate and improve:** Run controlled ablations across tokenizers, model sizes, learning-rate schedules, and decoding strategies (temperature and top-$k$ / top-$p$ sampling).

In the remainder of **Part 1**, we dive into **Steps 1 and 2**. Why start here instead of jumping straight to neural network layers? Because **a model is only as good as the tokens it is fed**. A model cannot learn patterns that are absent or corrupted in its dataset, and an inefficient data loader will bottleneck even the fastest GPU.

---

## 8. Step 1: Dataset Preparation

### 8.1 Why choose *TinyStories*?

When small language models (say, under 50M parameters) are trained on messy web scrapes like CommonCrawl or Wikipedia, they usually produce incoherent gibberish. For years, many people assumed this meant small models simply lacked the capacity to learn English grammar and narrative flow.

In 2023, Ronen Eldan and Yuanzhi Li [1] showed why that assumption was wrong. Web text mixes **two very different challenges** together:
1. **Learning to speak coherent English** (grammar, syntax, cause-and-effect, keeping track of characters).
2. **Memorizing millions of disconnected world facts** (dates, celebrities, geography, technical jargon).

A 20-million-parameter model fails on web text not because it cannot learn grammar or basic reasoning, but because its tiny parameter budget gets overwhelmed trying to memorize an encyclopedia.

*TinyStories* [1], [4] solves this by decoupling language fluency from encyclopedic trivia. It consists of short stories containing only words and concepts that a typical **three-to-four-year-old child** understands. Here is what a typical story in the dataset looks like:

> *Once upon a time, there was a little girl named Lily. She loved to play outside in the sunshine. One day, she saw a small red ball under a big tree. Lily picked it up and smiled. She took the ball home to show her mom, and they played together all afternoon.*

Because the vocabulary is focused and the narrative structure is clear, our **15M–30M parameter** model can dedicate all of its capacity to learning **grammar, factual consistency within a story, and narrative arcs**.

### 8.2 Data hygiene: what to verify before training

Downloading a dataset from Hugging Face [4] is only the beginning. Before converting a single word into numbers, we apply a strict pre-flight checklist:

| Check | Why it matters |
| :--- | :--- |
| **1. Inspect raw samples manually** | Print 10–20 stories and read them with your own eyes. Catch encoding artifacts, weird HTML tags, or truncated sentences early. |
| **2. Filter empty or broken records** | Empty strings, whitespace-only rows, or corrupted records waste context window slots and inject noise into gradient updates. |
| **3. Enforce a strict train / validation split** | Keep `validation` stories strictly separated from `train` stories. If training stories leak into validation, validation loss will look artificially low while real generalization suffers. |
| **4. Insert explicit story boundary markers** | When packing thousands of stories into one continuous stream, append an end-of-document token (such as `<|endoftext|>`) after every story so the model learns where one story ends and a new one begins. |
| **5. Record dataset metadata** | Log the dataset source, split sizes, character counts, and filtering rules so every experiment remains $100\%$ reproducible. |

> [!WARNING] Garbage in, garbage out
> Treat the dataset as part of the model's source code. If the training text contains duplicated paragraphs, broken character encodings, or train-validation leakage, the loss curve may look deceptively smooth while the generated stories remain repetitive or broken.

---

## 9. Step 2: Data Pre-processing (Tokenization & Memory Mapping)

Neural networks cannot multiply sentences—they multiply matrices of numbers. Once our stories are cleaned, our second job is to translate human-readable text into a compact stream of integer **token IDs** stored on disk in a format that can feed the GPU at high speed.

### 9.1 What is tokenization?

**Tokenization** splits a piece of text into smaller atomic units called **tokens**, and maps each unique token to an integer ID from a fixed **vocabulary**. Depending on the design, a token might be a whole word, a common subword syllable, a punctuation mark, or a single character.

For example, given the sentence:

```text
Raw text:   "The cat is sleeping."
Subwords:   ["The", " cat", " is", " sleep", "ing", "."]
Token IDs:  [464,   3797,   318,   3993,    278,   13]
```

Notice two subtle but important details:
- Common words like `" cat"` stay intact as a single token, while morphological forms like `" sleeping"` can be split into root + suffix (`" sleep"` + `"ing"`).
- Leading spaces are preserved inside the token itself (for example, `" cat"` rather than `"cat"`), so decoding the integer IDs back into text reconstructs the exact original spacing without guesswork.

### 9.2 Why Byte Pair Encoding (BPE)?

Why not tokenize by individual characters (`a`, `b`, `c`, ...) or by whole words?

- **Character-level tokenization** has a tiny vocabulary (under 100 symbols), which keeps the embedding table small. However, every sentence becomes $4\times$ to $5\times$ longer! A 256-token context window would barely hold two sentences, forcing the Transformer to spend most of its capacity just spelling words instead of tracking the story plot.
- **Word-level tokenization** keeps sequences short, but requires a massive vocabulary (hundreds of thousands of words) and still fails whenever it encounters a rare word or a new name—collapsing it into an unhelpful `<unk>` (unknown) token.

**Byte Pair Encoding (BPE)** [3] gives us the best of both worlds. It starts with individual bytes/characters and iteratively merges the most frequent adjacent pairs in the corpus:
- If `'i'` and `'n'` appear together constantly, they merge into `'in'`.
- If `'in'` and `'g'` appear together frequently, they merge into `'ing'`.
- If `'play'` and `'ing'` appear together often enough, they merge into `'playing'`.

Because BPE operates over bytes and frequent subwords, **common words become a single token** (keeping sequences short and fast), while **rare or compound words gracefully break down into familiar subword pieces**—meaning our model never sees an unknown `<unk>` token.

> [!TIP] Choosing the right vocabulary size for an SLM
> In a Transformer with embedding dimension $d_{\text{model}}$ and vocabulary size $V$, the token embedding matrix alone contains $V \times d_{\text{model}}$ parameters. If $d_{\text{model}} = 512$ and $V = 50{,}257$ (standard GPT-2 BPE), the embedding layer already uses $50{,}257 \times 512 \approx 25.7\text{M}$ parameters! In Part 2 and Part 3, we will examine how vocabulary size affects parameter budget—and why either weight-tying (sharing input and output embeddings) or using a domain-tailored vocabulary keeps an SLM lean.

### 9.3 Why store tokens in memory-mapped binary files (`train.bin` and `val.bin`)?

 *TinyStories* contains over **2 million short stories**—roughly **470 million tokens** in the training split alone. If we stored those tokens as Python lists of 64-bit integers or JSON strings and tried to load them all into RAM at once, a laptop or free cloud notebook would immediately run out of memory and crash.

Instead, we use two classic systems-engineering techniques (Figure 4):

1. **Compact 16-bit integer packing (`uint16`):** Since our vocabulary size $V$ is well below $2^{16} = 65{,}536$, every token ID fits comfortably inside an unsigned 16-bit integer (**2 bytes per token**). Even 470 million tokens take less than $1\text{ GB}$ on disk!
2. **OS Memory Mapping (`np.memmap`):** We write the packed `uint16` token IDs sequentially into flat binary files: `train.bin` and `val.bin`. During training, we open these files with `numpy.memmap`. Instead of copying the entire file into RAM, the operating system maps the file into virtual address space and pages in **only the tiny byte slices requested for the current mini-batch**.

![Diagram showing two connected panels. Top row: 1. Raw Story ("The cat sat on the mat." + <|endoftext|>), 2. BPE Tokens (["The", " cat", " sat", " on", " the", " mat", "."]), 3. Token IDs in uint16 ([464, 3797, 3332, 319, 262, 2603, 13], 2 bytes per token), 4. Disk Binary Files (train.bin and val.bin). Bottom panel: How OS Memory Mapping (np.memmap) constructs a training pair (x, y) on the fly by slicing Input x = [464, 3797, 3332, 319, 262] and Target y = [3797, 3332, 319, 262, 2603] shifted by +1 position on disk.](./tokenization-mmap.svg "Figure 4. The complete pre-processing and batch-loading pipeline. Stories are tokenized with BPE, packed as 2-byte uint16 integers into train.bin and val.bin, and sliced on the fly via OS memory mapping into input sequences (x) and +1 shifted target sequences (y).")

Look at the bottom panel of Figure 4. When training with a context length $T$, constructing a training example at random index $i$ in `train.bin` requires just two contiguous slices of length $T$:

```python
import numpy as np
import torch

def get_batch(bin_path: str, batch_size: int, context_length: int, device: str):
    """Stream a random batch of (input, target) token sequences from disk via mmap."""
    # Open the binary file as a memory-mapped array (zero full-file RAM load)
    data = np.memmap(bin_path, dtype=np.uint16, mode="r")

    # Pick random starting positions across the corpus
    ix = torch.randint(len(data) - context_length, (batch_size,))

    # Input x: tokens [i : i + T]
    x = torch.stack([torch.from_numpy((data[i : i + context_length]).astype(np.int64)) for i in ix])
    # Target y: tokens [i + 1 : i + 1 + T] (shifted right by exactly 1 position)
    y = torch.stack([torch.from_numpy((data[i + 1 : i + 1 + context_length]).astype(np.int64)) for i in ix])

    return x.to(device), y.to(device)
```

Notice how a single slice of length $T + 1$ actually gives the model **$T$ simultaneous training examples** at once:
- Given position $0$ (`"The"`), predict position $1$ (`" cat"`).
- Given positions $0..1$ (`"The cat"`), predict position $2$ (`" sat"`).
- Given positions $0..2$ (`"The cat sat"`), predict position $3$ (`" on"`).
- Given positions $0..3$ (`"The cat sat on"`), predict position $4$ (`" the"`).
- Given positions $0..4$ (`"The cat sat on the"`), predict position $5$ (`" mat"`).

Every position in `target` $y$ is the ground-truth next token for the corresponding prefix in `input` $x$.

### 9.4 Deliverables of Step 2 (and the round-trip sanity check)

At the end of our data pre-processing stage, our workspace contains four clean artifacts:

1. **Tokenizer configuration and vocabulary** (capable of encoding strings to IDs and decoding IDs back to strings).
2. **`train.bin`:** Contiguous `uint16` token IDs for all training stories, separated by `<|endoftext|>`.
3. **`val.bin`:** Contiguous `uint16` token IDs for all validation stories, strictly isolated from `train.bin`.
4. **Dataset metadata:** Total token counts, vocabulary size $V$, integer dtype (`uint16`), and file sizes.

> [!IMPORTANT] The Golden Rule of Data Pre-processing
> Before starting a multi-hour GPU training run, **always run a round-trip sanity check**: slice 200 integers out of `train.bin`, pass them through `tokenizer.decode(...)`, and read the output. If it does not reconstruct clean, readable stories with proper `<|endoftext|>` boundaries, stop and fix the pipeline immediately. A fast pipeline that feeds corrupted token IDs is still a broken pipeline.

---

## 10. Questions to think about

As we wrap up Part 1, here are three engineering questions to ponder before the next installment:

1. If we slice a fixed window of $T = 256$ tokens from a random offset in `train.bin`, that window might contain the end of one story, an `<|endoftext|>` token, and the beginning of the next story. Why is that actually *helpful* (or what does the `<|endoftext|>` token teach the model)?
2. Why does a smaller, domain-focused vocabulary (say, $8{,}192$ or $16{,}384$ tokens trained on *TinyStories*) allow us to build a deeper or wider Transformer under the same 20-million-parameter budget compared to a $50{,}257$-token vocabulary?
3. When our SLM generates a new story word by word, why wouldn't we simply pick the single highest-probability token ($100\%$ greedy decoding) at every step?

---

## 11. What comes next?

The main takeaway of Part 1 is simple: **an SLM is not merely a large model with fewer zeros. It is a tightly coupled engineering system in which the dataset, tokenizer, binary data layout, model architecture, and hardware constraints are designed to work in harmony.**

In **Part 2**, we will open up the neural network itself and build our **Decoder-Only Transformer** from the ground up. We will walk through token and positional embeddings, causal masked self-attention, feed-forward layers, residual connections, layer normalization, and exact parameter counting to hit our 15M–30M target cleanly.

## Code

The complete code for dataset curation, BPE tokenization, memory-mapped `.bin` generation, and model training will be shared in the project repository as the series progresses.

**GitHub repository:** *coming soon*

## Thanks for reading.

## References

1. R. Eldan and Y. Li, "TinyStories: How Small Can Language Models Be and Still Speak Coherent English?," *arXiv preprint arXiv:2305.07759*, 2023. [Online]. Available: https://arxiv.org/abs/2305.07759
2. T. B. Brown et al., "Language Models are Few-Shot Learners," in *Proc. Adv. Neural Inf. Process. Syst. (NeurIPS)*, vol. 33, pp. 1877–1901, 2020. [Online]. Available: https://arxiv.org/abs/2005.14165
3. R. Sennrich, B. Haddow, and A. Birch, "Neural Machine Translation of Rare Words with Subword Units," in *Proc. 54th Annu. Meeting Assoc. Comput. Linguist. (ACL)*, 2016, pp. 1715–1725. [Online]. Available: https://arxiv.org/abs/1508.07909
4. R. Eldan and Y. Li, "TinyStories Dataset," *Hugging Face Datasets*, 2023. [Online]. Available: https://huggingface.co/datasets/roneneldan/TinyStories
