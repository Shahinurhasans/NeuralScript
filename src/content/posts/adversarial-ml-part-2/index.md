---
title: 'How Can We Make a ML or DL Model Robust Against Adversarial Attacks? And What Does It Cost?'
description: 'Part 2 of a series on adversarial machine learning (AML): every major way to defend a model against adversarial attacks, from adversarial training to certified defenses, the defenses that failed, and the trade-off between robustness and accuracy, explained in simple words with a practical experiment.'
date: 2026-11-17
tags: [adversarial-ml, deep-learning, ml-security]
draft: true
---

Welcome back to the second blog of my adversarial machine learning series. In the [first blog](/posts/adversarial-ml-part-1/), we saw that a model can be fooled by a change so small that a person cannot even see it: a cat becomes a dog, a stop sign becomes a speed-limit sign, and a "35" becomes an "85".

At the end of that blog, I left three questions. This blog answers the third one:

**How can we make our model robust against adversarial attacks?**

Nothing is free, so we will also answer the question that comes right after it:

**What do we lose when we make a model robust?**

As before, I will keep the language simple. In the first blog I promised some mathematics, so there is a little bit here. Every symbol is explained in plain words, and you can skip the math part without losing the story.

## 1. A quick recap of Part 1

You only need to remember three things from the first blog:

- **Adversarial example:** a normal input plus a small, deliberately chosen change that makes the model give a wrong answer.
- **Budget (ε, "epsilon"):** the largest change we allow for each pixel. Pixel values go from 0 (black) to 1 (white), so ε = 0.1 means every pixel may go up or down by at most 0.1.
- **FGSM and PGD:** two ways to compute the change. FGSM takes **one big step** in the direction that hurts the model the most [1]. PGD takes **many small steps** and checks the direction again after every step [2].

### 1.1 First, question 1 from Part 1: why does PGD hurt more than FGSM?

Think of the attacker as a person on a foggy hill who wants to reach the **highest** point, where the model is most wrong. The fog means they can only see the slope right under their feet.

- **FGSM** looks at the slope once and jumps as far as it is allowed in that direction. If the hill curves, the jump lands in the wrong place.
- **PGD** takes a small step, looks at the slope again, takes another small step, and so on. It follows the curves of the hill, so it reaches a higher point.

That is why, in the experiment of Part 1, the CNN still had 33.2% accuracy under FGSM at ε = 0.2, but only 5.1% under PGD.

This also matters for defense. Keep this sentence in mind, because we will come back to it many times:

> [!IMPORTANT] Key idea
> A defense is only as good as the strongest attack it has been tested against.

## 2. What does "robust" actually mean?

A model is **robust** on an input if **no** change inside the budget can change its answer. Not "random changes", not "the changes we tried", but **no** change.

In practice, we measure **robust accuracy**: the percentage of test inputs that the model gets right **and** keeps right under the strongest attack we can find inside the budget. Normal accuracy on unchanged inputs is called **clean accuracy**.

Robustness is always "robust **against what**?" A company that makes safes never says "this safe cannot be opened". It says something like "this safe resists 30 minutes of drilling by a professional with these tools". For a model, we have to say the same kind of thing. This description is called the **threat model**:

| Question | Example answers |
| :-- | :-- |
| **What kind of change?** | A small change to every pixel; a small total change; a sticker or patch; a rotation; a change in brightness |
| **How big?** | ε = 0.2 or 0.3 for MNIST digits; ε = 8/255 (about 0.03) for CIFAR-10 photos |
| **What does the attacker know?** | Everything, including the model's weights (white-box); only the model's answers (black-box); nothing, so they attack their own copy and hope it transfers (transfer attack) |
| **When does the attack happen?** | At test time, by changing the input (evasion, the focus of this blog); at training time, by changing the training data (poisoning, like Microsoft's Tay in Part 1) |

> [!NOTE] Two ways to measure "small"
> **L∞ ("L-infinity"):** no single pixel may change by more than ε. This is what we used in Part 1 and what we use in this blog. **L2:** the total change, measured like a distance, must be at most ε. Under L2, a few pixels may change a lot as long as most stay the same.

## 3. The big picture: five families of defenses

There are many defense methods, but almost all of them belong to one of five families. Think of them as five different answers to the question "where do we stop the attack?"

![A tree diagram with the root "How do we make a model robust?" and five branches: 1. train it on attacks (adversarial training: FGSM-AT, PGD-AT, Free and Fast AT, TRADES, MART, AWP, extra data); 2. clean the input (JPEG compression, bit-depth reduction, random resizing, denoisers, GAN and diffusion purifiers); 3. catch the attack (detector networks, feature squeezing, statistical tests, refusing to answer); 4. prove it is safe (randomized smoothing, interval bound propagation, convex relaxation, Lipschitz networks); 5. make the model smoother (gradient penalty, Lipschitz limits, bigger models, pre-training, data augmentation, ensembles)](./defense-map.svg "Figure 1. The five families of defenses covered in this blog. A sixth layer of protection, the system around the model, is covered in Section 9.")

We will go through them one by one, then look at the defenses that **failed**, and then at the **cost** of robustness.

## 4. Method 1: Adversarial training (train the model on attacks)

This is the most important method in this blog. After more than ten years of research, it is still the most reliable way to make a model robust.

### 4.1 The idea

Remember the student from Part 1? They had memorized patterns, so when one word in a question changed ("absorb" became "release"), they still picked the old answer.

How would a good teacher fix this student? By giving them **practice tests full of trick questions**. Every time the student falls for a trick, the teacher shows the correct answer. After enough practice, the student learns to read every word carefully instead of jumping at familiar words.

Adversarial training does exactly this. During training, **we attack our own model**, and then teach it the correct answer for the attacked inputs. You can also think of it as a vaccine: the model is shown a controlled dose of the attack, so it builds immunity.

![Four boxes in a loop: 1. take a batch of 128 training images; 2. FGSM or PGD makes the hardest version of each image, with every pixel changing by at most epsilon; 3. update the model so it gives the correct label on these hard images; 4. the model is harder to fool, so next round the attacker must push harder. An arrow goes back to step 1.](./adversarial-training-loop.svg "Figure 2. The adversarial training loop. In normal training, step 2 does not exist: the model only ever sees the clean images.")

### 4.2 The math in one line (you can skip this)

Madry et al. [2] wrote adversarial training as one formula:

$$
\min_{\theta}\; \mathbb{E}_{(x,\,y)} \Big[ \max_{\|\delta\|_\infty \le \epsilon} L\big(f_\theta(x + \delta),\, y\big) \Big]
$$

It looks scary, but it is just the loop in Figure 2. Let us read it piece by piece:

| Symbol | Meaning in plain words |
| :-- | :-- |
| $x$, $y$ | A training image and its correct label |
| $\delta$ ("delta") | The change the attacker adds to the image |
| $\|\delta\|_\infty \le \epsilon$ | No pixel may change by more than $\epsilon$ |
| $f_\theta$ | The model, with weights $\theta$ ("theta") |
| $L$ | The loss: a number that says how wrong the model is |
| $\max_{\delta}$ | **The attacker's job:** find the change that makes the model as wrong as possible |
| $\min_{\theta}$ | **Our job:** choose weights so that even this worst change does as little damage as possible |
| $\mathbb{E}$ | Take the average over all training images |

In one sentence: **for every training image, find the worst possible attack, then train the model to be right even on that.** It is a game between two players, the attacker inside and the trainer outside. Normal training is the same formula with the $\max$ part removed.

The inner $\max$ cannot be solved exactly, so we use an attack to get close to it. **Which attack we use is the main difference between the methods below.**

### 4.3 FGSM adversarial training (2015)

The first version came from the same paper that introduced FGSM [1]. For each batch, it makes FGSM versions of the images and trains on a 50/50 mix of clean and attacked images.

- **Good:** cheap. FGSM needs only one extra gradient computation, so training costs about twice as much as normal.
- **Bad:** the model learns to beat **FGSM**, not attacks in general. A stronger attack like PGD can still break it. Worse, FGSM training can suffer from **catastrophic overfitting**: in the middle of training, robustness against PGD suddenly drops to almost zero, while robustness against FGSM looks perfect [3].

Back to the student: if all the trick questions in practice tests are of one kind, the student gets very good at that one kind, and is still fooled by a new kind.

### 4.4 PGD adversarial training (2018): the gold standard

Madry et al. [2] used **PGD** for the inner $\max$, usually with 7 to 10 steps and a random starting point. Since PGD is a much stronger attack, the model is trained against much harder examples.

On CIFAR-10 (small 32 × 32 color photos of 10 classes such as airplanes, cats and trucks), a normally trained network reached 95.2% clean accuracy but was almost completely broken by PGD. Their PGD-trained network reached **87.3% clean accuracy and 45.8% accuracy under PGD** at ε = 8/255 [2]. Less than half sounds low, but before this, almost every defense dropped to near 0% against a strong attack.

PGD adversarial training is still the base of most of the strongest models on RobustBench, a public leaderboard of robust models [4].

- **Good:** reliable; it has survived years of attacks from many researchers.
- **Bad:** slow. Every PGD step needs one extra forward and backward pass through the network, so 10 steps make training many times more expensive.

### 4.5 Making it cheaper: Free and Fast adversarial training

Because PGD training is so slow, researchers looked for shortcuts:

- **Free adversarial training** [5]: when the model computes gradients to update its weights, the gradient with respect to the input comes almost for free. Free AT reuses it to update the attack too, and replays each batch a few times. Robustness becomes close to PGD training at close to the cost of normal training.
- **Fast adversarial training** [3]: go back to FGSM, but start from a **random point** inside the budget instead of the original image. This simple change makes FGSM training work much better, and a robust CIFAR-10 model can be trained in minutes instead of hours or days. The danger of catastrophic overfitting is still there, so you have to check PGD accuracy during training and stop early if it collapses.

### 4.6 Better training goals: TRADES, MART and AWP

These methods keep the "train on attacks" idea but change **what the model is asked to learn**:

- **TRADES** [6] splits the goal into two parts: (1) be correct on the clean image, and (2) give the **same answer** on the clean image and the attacked image. A knob called $\beta$ ("beta") decides how much to care about part (2). Small $\beta$: more accurate but more fragile. Large $\beta$: more robust but less accurate. TRADES turns the trade-off into a dial you can turn. On CIFAR-10 it reported 84.9% clean accuracy and 56.6% robust accuracy at ε = 8/255 [6].
- **MART** [7] pays extra attention to the training images the model already gets wrong, because those are the weakest points in its defense.
- **AWP** (adversarial weight perturbation) [8] attacks not only the input but also, slightly, the model's weights during training. This gives a "flatter" model that generalizes its robustness better to new images.

A warning from this area: **adversarial logit pairing** [9] first reported very strong robustness on ImageNet, but a later, stronger evaluation showed it was much weaker than claimed [10]. Remember the key idea from Section 1.

### 4.7 More data helps a lot

Robust learning needs **more data** than normal learning [11]. Adding extra unlabeled images [12], and later millions of images generated by diffusion models [13], made a huge difference. In 2023, a model trained this way reached **70.69% robust accuracy** on CIFAR-10 at ε = 8/255 under AutoAttack, a strong standard set of attacks [13]. Compare that with 45.8% in 2018.

### 4.8 Ensemble adversarial training

In a **transfer attack**, the attacker cannot see our model, so they attack their own copy and hope the attack works on ours too. Ensemble adversarial training [14] trains the model on adversarial examples made on **several other, already-trained models**. This helps a lot against transfer attacks, but not against an attacker who can see our model.

### 4.9 What adversarial training does to the model

Normal training only cares that each training image is on the correct side of the decision boundary. Adversarial training asks for more: the **whole square of allowed changes** around each image must be on the correct side. This pushes the boundary away from the images and leaves a safety margin.

![Two panels with cat points in blue and dog points in orange, each surrounded by a dashed square showing the allowed change. Left, normal training: the boundary bends close to one cat and one dog and passes through their squares, which are marked in red. Right, adversarial training: the boundary sits in the middle of the gap and every square is fully on its own side](./robust-boundary.svg "Figure 3. Left: after normal training, every point is on the correct side, but the boundary passes through some of the dashed squares, so a small allowed push flips those answers. Right: adversarial training moves the boundary until every square is on its own side. Illustration, not the output of a real model.")

## 5. Method 2: Clean the input before the model sees it

The idea: adversarial noise is very finely tuned. If we "wash" the input before giving it to the model, maybe the noise falls off, like ironing a crumpled shirt before wearing it.

Ways to clean the input:

- **Simple image processing:** JPEG compression, reducing the number of colors (bit-depth reduction), and other transformations [15].
- **Randomness:** randomly resize the image and add random padding before classifying it [16].
- **Denoiser networks:** a separate network trained to remove adversarial noise [17], [18].
- **Generative models:** project the input onto images that a GAN can draw [19], or add noise and let a diffusion model redraw a clean version [20].

![A pipeline: an adversarial image of the digit 7 with hidden noise goes into a cleaner (JPEG compression, bit-depth reduction, denoiser network, or GAN or diffusion model), which outputs a clean 7. The same model, not retrained, then says 7. A red box explains the weakness: if the attacker knows the cleaner is there, they attack cleaner plus model as one big model](./input-purification.svg "Figure 4. Input purification puts a cleaner in front of the model. Its weakness is the adaptive attack: an attacker who knows about the cleaner designs noise that survives it.")

- **Good:** works in front of any model, with no retraining. Often costs little clean accuracy.
- **Bad:** most simple cleaners were broken once the attacker attacked "cleaner + model" together [21]. If the cleaner is not differentiable, the attacker pretends it is the identity function when computing gradients (a trick called BPDA). If the cleaner is random, the attacker averages over many random versions (a trick called EOT). Diffusion-based purification holds up much better, but it is very slow and hard to evaluate correctly.

## 6. Method 3: Detect the attack and refuse to answer

Instead of answering correctly, the model can just say **"this input looks suspicious, I will not answer"**. It is like a shopkeeper checking a banknote under UV light before accepting it.

- **Detector networks:** a second, small network trained to tell normal inputs from adversarial ones [22].
- **Feature squeezing** [23]: ask the model twice, once with the original input and once with a "squeezed" version (fewer colors, slightly blurred). For a normal image, both answers are almost the same. For an adversarial image, the answers are often very different, so the system raises an alarm.
- **Statistical tests:** check whether the input or the model's internal activations look different from normal data.

- **Good:** useful as an alarm in a real system, for example to send suspicious inputs to a person.
- **Bad:** an attacker who knows about the detector simply attacks the model **and** the detector at the same time. Carlini and Wagner bypassed ten different detection methods this way [24]. A detector alone is not a defense.

## 7. Method 4: Certified defenses (prove it, do not just test it)

All the methods so far are **tested**: "we tried strong attacks, and they failed". But tomorrow someone may invent a stronger attack. A **certified defense** gives a mathematical proof instead: **"for this input, no change smaller than R can change the answer."**

Think of two bridges. One has "not fallen down yet". The other has an engineer's certificate that says it can carry 10 tons. For a hospital or a car, you want the second kind.

### 7.1 Randomized smoothing

This is the most popular certified method [25], and it is surprisingly simple:

1. Train the model on images with random noise added.
2. To classify an input, make many noisy copies of it (for example 1,000), and classify each copy.
3. The final answer is the **majority vote**.
4. The bigger the majority, the bigger the guaranteed radius R.

Why does this work? A tiny change to the input can only shift the "cloud" of noisy copies a tiny bit, so it can only change a few votes. If the winner is far ahead, a few votes cannot change the result, and the math tells us exactly how far ahead is enough.

![Left: an input image is copied 1,000 times with random noise added; each copy goes through a model trained on noise; votes are cat 920, dog 60, fox 20, so the final answer is cat. Right: the input point sits inside the cat region with a dashed circle of radius R around it, fully inside the cat region](./randomized-smoothing.svg "Figure 5. Randomized smoothing. Left: classify many noisy copies and take the majority vote. Right: the strength of the vote gives a radius R, and it is proven that no change smaller than R can flip the answer. The vote counts are made up for illustration.")

On ImageNet, randomized smoothing reached **49% certified accuracy** for changes with L2 size up to 0.5 [25]. That means for about half of the test images, it is proven that no such change can fool the model.

### 7.2 Bound propagation: IBP and convex relaxation

Instead of searching for the worst attack, these methods send the **whole box of allowed inputs** through the network at once and compute the smallest and largest value each output can take. If the smallest possible score of the correct class is still bigger than the largest possible score of every other class, no attack inside the box can work. **Interval bound propagation (IBP)** [26] computes simple, fast bounds; **convex relaxation** [27] computes tighter but more expensive ones. The model is then trained to make these proofs succeed.

### 7.3 Lipschitz networks

A **Lipschitz constant** is a speed limit for the model: it says how much the output can change when the input changes by one unit. Methods like Parseval networks [28] build this speed limit into the network. If the correct class is ahead by more than "speed limit × ε", no change of size ε can catch up.

- **Good:** real guarantees, not just "no attack has worked so far".
- **Bad:** the guaranteed radius is usually small, clean accuracy is clearly lower, and randomized smoothing needs thousands of forward passes for each prediction.

## 8. Method 5: Make the model naturally smoother

These methods try to make the model less sensitive to small changes in general. They usually work best **together with** adversarial training, not alone.

- **Input gradient regularization** [29]: during training, punish the model when its output changes quickly with tiny input changes.
- **Lipschitz and spectral limits:** keep the weights from becoming too large, which limits how much a small change can grow inside the network.
- **Bigger models:** Madry et al. found that small networks cannot become robust at all, while wider networks can [2].
- **Pre-training** on a large dataset before adversarial training improves robustness [30].
- **Data augmentation**, done the right way, also helps [31].
- **Ensembles** (several models voting) help a little, but combining several weak defenses does **not** give a strong one [32].

## 9. Method 6: Protect the system around the model

A model is always part of a bigger system, and the system can help too:

- **Show less.** Return only the final label, not the confidence scores. Many black-box attacks use the scores to find their way.
- **Limit and watch queries.** Black-box attacks often need thousands of queries. A user who sends thousands of almost identical images is suspicious.
- **Use more than one source of information.** For the speed-limit sign from Part 1, a car could compare what the camera reads with a map of known speed limits. An "85" on a city street should not be trusted.
- **Keep a person in the loop** for high-stakes decisions, like the heart disease example from Part 1.
- **Protect the training data** from poisoning, like what happened to Tay.

## 10. The defenses that failed: the trap of gradient masking

**Now an important question rises: if so many defenses exist, why is the problem still not solved?**

Because many published defenses did not actually make the model robust. They only **hid the slope**.

Remember that FGSM and PGD use the gradient, the slope of the loss, to find the direction of attack. If a defense makes this slope flat, noisy or impossible to compute, gradient attacks get lost and the defense **looks** robust. But the wrong answers are still there, very close. This is called **gradient masking** or **obfuscated gradients**.

![A plot of how wrong the model is against the change made to the input. Around the original input, the curve is flat, so the gradient is zero and the attack gives up. A little further away, but still within the allowed change, the curve rises sharply above the line where the model becomes wrong](./gradient-masking.svg "Figure 6. Gradient masking. The defense makes the loss flat around the input, so a gradient-based attack finds no direction and reports the model as robust. But a wrong answer is still within the allowed change, and an adaptive attack finds it.")

Some famous examples:

- **Defensive distillation** (2016) [33] reported that it made attacks dramatically less successful. A year later, a stronger attack (the C&W attack) broke it [34].
- At ICLR 2018, nine new white-box defenses were published. Athalye, Carlini and Wagner found that **seven** of them relied on obfuscated gradients, and their adaptive attacks fully broke six and partly broke one [21].
- In 2020, Tramèr et al. broke **thirteen** more recent defenses with adaptive attacks [35].

So how do we test a defense honestly? Researchers have written down a checklist [36]. The most important points:

1. **Use strong attacks:** PGD with many steps and several random starts, and AutoAttack [4].
2. **Use adaptive attacks:** attack the **whole** defense, including any cleaner, detector or randomness.
3. **Run sanity checks:**
   - Accuracy must go down as ε goes up, and reach about 0% for a very large ε.
   - More attack steps should never make the model look **more** robust.
   - If a black-box attack (which cannot see gradients) works better than a white-box attack (which can), the gradients are probably masked.

> [!TIP]
> If a defense looks robust but none of the sanity checks has been done, do not trust it yet.

## 11. The trade-off: robustness vs performance

**Now the most important question of this blog: if adversarial training works, why doesn't everyone use it?**

Because robustness has a price. Here are the costs, one by one.

### 11.1 Cost 1: lower accuracy on normal inputs

| Model (CIFAR-10, ε = 8/255) | Clean accuracy | Accuracy under PGD |
| :-- | :-- | :-- |
| Normal training [2] | 95.2% | close to 0% |
| PGD adversarial training [2] | 87.3% | 45.8% |
| TRADES [6] | 84.9% | 56.6% |

> [!NOTE]
> These numbers come from the original papers, which used different network sizes and slightly different attack settings. They show the pattern, not an exact head-to-head comparison.

Robust models are less accurate on **normal** images. Why?

In Part 1, we saw that models use **patterns people cannot see**: tiny, consistent pixel patterns that really are useful for prediction [37]. These patterns help clean accuracy, but they are fragile, because an attacker can change them easily. A robust model is **not allowed** to rely on them. It must use robust features like shape and outline, and there is less of that information. So it loses some accuracy. Tsipras et al. showed that, in some settings, this trade-off cannot be avoided [38].

Back to the student one more time. Shortcuts and tricks often give quick right answers on a normal exam. A student who is told to ignore every shortcut and work only from real understanding might score slightly lower on an easy normal exam, but they will not fall for the trick questions.

There is also a **dial**. The bigger the training budget ε (or the TRADES knob $\beta$), the more robust the model becomes, and the more clean accuracy it loses. We will see this dial in our own experiment in Section 12.

### 11.2 Cost 2: training time and money

PGD adversarial training with 10 steps needs many times more forward and backward passes than normal training. For a big model on a big dataset, that can mean days of GPU time and a much bigger bill. This is the reason Free and Fast adversarial training exist.

### 11.3 Cost 3: more data and bigger models

Robustness needs more data [11] and bigger networks [2]. The best CIFAR-10 models today use very large networks and millions of extra generated images [13]. Not everyone can afford that.

### 11.4 Cost 4: robust overfitting

In normal training, test accuracy usually keeps improving or stays flat. In adversarial training, robust test accuracy often **goes down** after some point, while robust accuracy on the training data keeps going up [39]. The model memorizes how to resist attacks on its training images, not in general. The usual fix is **early stopping**: keep the checkpoint with the best robust accuracy on a validation set.

### 11.5 Cost 5: robust only against what you trained for

A model trained against L∞ changes is not automatically robust against L2 changes, rotations or stickers. Training against several kinds at once is possible, but it costs even more accuracy [40]. The stickers on the stop sign in Part 1 are a completely different threat model from tiny pixel changes.

### 11.6 Cost 6: slower predictions

Adversarial training does not slow down predictions, because the final model is a normal network. But randomized smoothing needs thousands of forward passes per input, and diffusion purification runs a large generative model before every prediction. On an edge device like a smartwatch, that may be impossible.

### 11.7 Is the trade-off a law of nature?

Not necessarily, and this is the hopeful part.

- Yang et al. [41] measured real datasets like CIFAR-10 and found that images of different classes are far enough apart that a classifier that is **both** accurate and robust should exist at the usual budgets. The gap comes from our training methods, not from the data.
- Extra unlabeled data can reduce the trade-off [42], and the gap keeps getting smaller every year [13].
- Robustness also has a nice side effect. The gradients of robust models line up with features that people understand, like edges and shapes [38], [43]. We will see this in our own experiment.

## 12. A practical experiment

**Beside these theoretical concepts, let's go through a practical observation again.**

In Part 1, our MLP classifier dropped from 97.5% on clean images to **0.0%** under PGD at ε = 0.2. We took that exact same MLP architecture and trained it with the defenses from Section 4 to see if we could save it, and what it would cost.

### 12.1 Setup

- **Data and model:** the same MNIST dataset (60,000 training images, 10,000 test images) and the same MLP as in Part 1 (two hidden layers of 256 and 128 neurons, 10 outputs).
- **Training:** the same recipe as Part 1: Adam optimizer, learning rate 0.001, batch size 128, 5 epochs.
- **Four ways of training**, all with a training budget of ε = 0.2, the largest budget we attacked with in Part 1:
  1. **Standard training** (no defense).
  2. **FGSM adversarial training**, with a 50/50 mix of clean and FGSM images [1].
  3. **PGD adversarial training**, 10 steps of size ε/4 with a random start [2].
  4. **TRADES** with $\beta = 6$ and the same 10-step attack [6].
- **The trade-off dial:** two more PGD adversarial training runs, with training budgets ε = 0.1 and ε = 0.3.
- **Evaluation:** all 10,000 test images, clean and under FGSM and PGD (20 steps, random start) at ε = 0.05, 0.1, 0.2 and 0.3.

### 12.2 Results

![Grouped bar chart comparing four training methods on the same MLP at training budget epsilon = 0.2. Standard training: clean 97.8%, PGD 0.1 5.9%, FGSM 0.2 0.9%, PGD 0.2 0.0%. FGSM adversarial training: clean 96.9%, PGD 0.1 34.6%, FGSM 0.2 86.0%, PGD 0.2 3.1%. PGD adversarial training: clean 87.6%, PGD 0.1 72.6%, FGSM 0.2 53.1%, PGD 0.2 48.2%. TRADES: clean 92.0%, PGD 0.1 82.0%, FGSM 0.2 68.7%, PGD 0.2 63.5%](./experiment-defenses.png "Figure 7. Test accuracy of the same MLP trained in four ways (training budget ε = 0.2), evaluated on clean images, under PGD at ε = 0.1, and under FGSM and PGD at ε = 0.2. One training run per method.")

**1. FGSM training gives a false sense of security.** Look at the second group of bars in Figure 7. Under FGSM at ε = 0.2, the FGSM-trained model jumps from 0.9% to **86.0%**. If we stopped testing there, we would celebrate! But when we test the exact same model with PGD at ε = 0.2, accuracy collapses to **3.1%**. The model learned to beat the one-step FGSM trick, not the real worst-case change. This is a live demonstration of our key rule from Section 1: *a defense is only as good as the strongest attack it is tested against.*

**2. PGD adversarial training and TRADES provide real robustness.** Under PGD at ε = 0.2, where the standard model gets **0.0%** and the FGSM-trained model gets **3.1%**, PGD adversarial training holds at **48.2%** and TRADES reaches **63.5%**. Under a moderate PGD attack (ε = 0.1), TRADES keeps **82.0%** accuracy compared to just 5.9% for standard training.

![Two panels. Left: line chart of test accuracy against PGD attack budget epsilon from 0 to 0.3 for Standard (97.8% down to 0%), PGD-AT trained at 0.1 (96.4% down to 2.6%), PGD-AT trained at 0.2 (87.6% down to 12.3%), and PGD-AT trained at 0.3 (44.5% down to 29.6%). Right: bar chart of training time for 5 epochs: Standard 9s (1.0x), FGSM-AT 14s (1.6x), PGD-AT 44s (5.0x), TRADES 52s (6.0x)](./experiment-tradeoff.png "Figure 8. Left: the clean-vs-robust trade-off across different training budgets ε. Right: training time for 5 epochs on the same hardware.")

**3. The trade-off between clean accuracy, robustness, and capacity is crystal clear.** Look at the left panel of Figure 8:
- **Standard training (ε = 0):** highest clean accuracy (**97.8%**), but collapses to 5.9% at ε = 0.1 and 0.0% at ε = 0.2.
- **PGD-AT trained at ε = 0.1:** loses only 1.4 points of clean accuracy (**96.4%**) while jumping to **83.1%** under PGD at ε = 0.1.
- **PGD-AT trained at ε = 0.2:** clean accuracy drops to **87.6%** (about 10 points lower than standard), in exchange for **48.2%** accuracy at ε = 0.2.
- **PGD-AT trained at ε = 0.3:** when we push the training budget to 0.3, our small 2-layer MLP does not have enough capacity to hold a wide safety margin around every digit, so clean accuracy drops to **44.5%**, though its curve stays almost flat all the way to ε = 0.3 (**29.6%**). This matches what Madry et al. [2] discovered: stronger robustness demands bigger networks.

**4. Robustness costs compute.** As the right panel of Figure 8 shows, 5 epochs of PGD adversarial training took **5.0×** longer than standard training, and TRADES took **6.0×** longer.

![Grid of four MNIST digits (0, 1, 7, 8) showing the original image, the PGD-attacked image on the standard model, the change made to the standard model, the PGD-attacked image on the robust model, and the change made to the robust model](./experiment-perturbations.png "Figure 9. PGD attacks (ε = 0.2) on four test digits (0, 1, 7, and 8). The standard model is fooled with 100% confidence on every digit, while the robust model gets all four right. Notice the right-most column: to push the robust model, the attack has to draw changes that trace the actual stroke of the digit.")

**5. A robust model looks at the actual shape of the digit.** Look at the changes made by the attacker in Figure 9 (columns 3 and 5, where red means brightening pixels and blue means darkening them). On the standard model, the pattern looks noisy and scattered, yet it fools the network with **100% confidence** on all four digits. On the robust model, the attacker is forced to concentrate blue (erasing) directly along the white strokes of the digit—and at ε = 0.2, the robust model still recognizes all four digits correctly.

## 13. If I had to make my model robust tomorrow

Here is a simple recipe that puts everything together:

1. **Write down the threat model.** What kind of change, how big, and what does the attacker know?
2. **Start with PGD adversarial training**, using the ε from step 1. Use TRADES if you want to tune the balance between clean accuracy and robustness.
3. **Use a bigger model, more data, or pre-training**, if you can afford it.
4. **Use early stopping** based on robust accuracy on a validation set, to avoid robust overfitting.
5. **Evaluate honestly:** AutoAttack, adaptive attacks, and the sanity checks from Section 10.
6. **If you need a guarantee** (medicine, cars), look at randomized smoothing or certified training.
7. **Protect the system around the model:** limit queries, hide scores, use more than one source of information, and keep a person in the loop for high-stakes decisions.
8. **Always report both clean accuracy and robust accuracy.** One number is never enough.

## 14. All the methods in one table

| Method | Idea in one line | Holds up against strong, adaptive attacks? | Clean accuracy cost | Compute cost |
| :-- | :-- | :-- | :-- | :-- |
| FGSM adversarial training | Train on one-step attacks | Weak; can collapse | Small | About 2× training |
| PGD adversarial training | Train on many-step attacks | **Yes**, the most trusted | Medium | About 5–11× training |
| Free / Fast AT | Cheaper versions of PGD training | Mostly yes, if checked | Medium | About 1–3× training |
| TRADES, MART, AWP | Better training goals | **Yes** | Medium, adjustable | Like PGD training |
| Extra or generated data | More data for robust learning | **Yes**, the best results today | Reduces the cost | Much more data and compute |
| Input cleaning | Wash the input first | Simple ones: no. Diffusion: partly | Small | Slower predictions |
| Detection | Spot the attack and refuse | No, not alone | None, but some rejections | Small |
| Randomized smoothing | Majority vote over noisy copies | **Yes, with a proof** (small radius) | Large | Very slow predictions |
| IBP, convex relaxation, Lipschitz | Compute proven bounds | **Yes, with a proof** (small radius) | Large | Expensive training |
| Gradient penalty, bigger models, pre-training | Make the model smoother | Helps, mostly with AT | Varies | Varies |
| Defensive distillation and other masking defenses | Hide the gradient | **No**, broken | Small | Small |

## 15. Questions to think about

At the end of the blog, let's raise some questions again:

1. If a robust model has to ignore some useful patterns, can a model ever be both 100% accurate and 100% robust?
2. Who decides how big ε should be? The stickers on a stop sign are not "small" at all, but they still fool the model.
3. Can we adversarially train a large language model against tricky prompts, and what would it cost?

## Code

The code for training the models and running the attacks will be shared here.

**GitHub repository:** *coming soon*

## Thanks for reading.

## References

1. I. J. Goodfellow, J. Shlens, and C. Szegedy, "Explaining and harnessing adversarial examples," in *Proc. Int. Conf. Learn. Represent. (ICLR)*, 2015. [Online]. Available: https://arxiv.org/abs/1412.6572
2. A. Madry, A. Makelov, L. Schmidt, D. Tsipras, and A. Vladu, "Towards deep learning models resistant to adversarial attacks," in *Proc. Int. Conf. Learn. Represent. (ICLR)*, 2018. [Online]. Available: https://arxiv.org/abs/1706.06083
3. E. Wong, L. Rice, and J. Z. Kolter, "Fast is better than free: Revisiting adversarial training," in *Proc. Int. Conf. Learn. Represent. (ICLR)*, 2020. [Online]. Available: https://arxiv.org/abs/2001.03994
4. F. Croce et al., "RobustBench: A standardized adversarial robustness benchmark," in *Proc. Adv. Neural Inf. Process. Syst. (NeurIPS) Datasets and Benchmarks*, 2021. [Online]. Available: https://arxiv.org/abs/2010.09670
5. A. Shafahi et al., "Adversarial training for free!," in *Proc. Adv. Neural Inf. Process. Syst. (NeurIPS)*, 2019. [Online]. Available: https://arxiv.org/abs/1904.12843
6. H. Zhang, Y. Yu, J. Jiao, E. P. Xing, L. El Ghaoui, and M. I. Jordan, "Theoretically principled trade-off between robustness and accuracy," in *Proc. Int. Conf. Mach. Learn. (ICML)*, 2019, pp. 7472–7482. [Online]. Available: https://arxiv.org/abs/1901.08573
7. Y. Wang, D. Zou, J. Yi, J. Bailey, X. Ma, and Q. Gu, "Improving adversarial robustness requires revisiting misclassified examples," in *Proc. Int. Conf. Learn. Represent. (ICLR)*, 2020. [Online]. Available: https://openreview.net/forum?id=rklOg6EFwS
8. D. Wu, S.-T. Xia, and Y. Wang, "Adversarial weight perturbation helps robust generalization," in *Proc. Adv. Neural Inf. Process. Syst. (NeurIPS)*, 2020. [Online]. Available: https://arxiv.org/abs/2004.05884
9. H. Kannan, A. Kurakin, and I. Goodfellow, "Adversarial logit pairing," *arXiv preprint arXiv:1803.06373*, 2018. [Online]. Available: https://arxiv.org/abs/1803.06373
10. L. Engstrom, A. Ilyas, and A. Athalye, "Evaluating and understanding the robustness of adversarial logit pairing," *arXiv preprint arXiv:1807.10272*, 2018. [Online]. Available: https://arxiv.org/abs/1807.10272
11. L. Schmidt, S. Santurkar, D. Tsipras, K. Talwar, and A. Madry, "Adversarially robust generalization requires more data," in *Proc. Adv. Neural Inf. Process. Syst. (NeurIPS)*, 2018. [Online]. Available: https://arxiv.org/abs/1804.11285
12. Y. Carmon, A. Raghunathan, L. Schmidt, J. C. Duchi, and P. S. Liang, "Unlabeled data improves adversarial robustness," in *Proc. Adv. Neural Inf. Process. Syst. (NeurIPS)*, 2019. [Online]. Available: https://arxiv.org/abs/1905.13736
13. Z. Wang, T. Pang, C. Du, M. Lin, W. Liu, and S. Yan, "Better diffusion models further improve adversarial training," in *Proc. Int. Conf. Mach. Learn. (ICML)*, 2023. [Online]. Available: https://arxiv.org/abs/2302.04638
14. F. Tramèr, A. Kurakin, N. Papernot, I. Goodfellow, D. Boneh, and P. McDaniel, "Ensemble adversarial training: Attacks and defenses," in *Proc. Int. Conf. Learn. Represent. (ICLR)*, 2018. [Online]. Available: https://arxiv.org/abs/1705.07204
15. C. Guo, M. Rana, M. Cisse, and L. van der Maaten, "Countering adversarial images using input transformations," in *Proc. Int. Conf. Learn. Represent. (ICLR)*, 2018. [Online]. Available: https://arxiv.org/abs/1711.00117
16. C. Xie, J. Wang, Z. Zhang, Z. Ren, and A. Yuille, "Mitigating adversarial effects through randomization," in *Proc. Int. Conf. Learn. Represent. (ICLR)*, 2018. [Online]. Available: https://arxiv.org/abs/1711.01991
17. F. Liao, M. Liang, Y. Dong, T. Pang, X. Hu, and J. Zhu, "Defense against adversarial attacks using high-level representation guided denoiser," in *Proc. IEEE/CVF Conf. Comput. Vis. Pattern Recognit. (CVPR)*, 2018, pp. 1778–1787. [Online]. Available: https://arxiv.org/abs/1712.02976
18. D. Meng and H. Chen, "MagNet: A two-pronged defense against adversarial examples," in *Proc. ACM SIGSAC Conf. Comput. Commun. Secur. (CCS)*, 2017, pp. 135–147. [Online]. Available: https://arxiv.org/abs/1705.09064
19. P. Samangouei, M. Kabkab, and R. Chellappa, "Defense-GAN: Protecting classifiers against adversarial attacks using generative models," in *Proc. Int. Conf. Learn. Represent. (ICLR)*, 2018. [Online]. Available: https://arxiv.org/abs/1805.06605
20. W. Nie, B. Guo, Y. Huang, C. Xiao, A. Vahdat, and A. Anandkumar, "Diffusion models for adversarial purification," in *Proc. Int. Conf. Mach. Learn. (ICML)*, 2022. [Online]. Available: https://arxiv.org/abs/2205.07460
21. A. Athalye, N. Carlini, and D. Wagner, "Obfuscated gradients give a false sense of security: Circumventing defenses to adversarial examples," in *Proc. Int. Conf. Mach. Learn. (ICML)*, 2018, pp. 274–283. [Online]. Available: https://arxiv.org/abs/1802.00420
22. J. H. Metzen, T. Genewein, V. Fischer, and B. Bischoff, "On detecting adversarial perturbations," in *Proc. Int. Conf. Learn. Represent. (ICLR)*, 2017. [Online]. Available: https://arxiv.org/abs/1702.04267
23. W. Xu, D. Evans, and Y. Qi, "Feature squeezing: Detecting adversarial examples in deep neural networks," in *Proc. Netw. Distrib. Syst. Secur. Symp. (NDSS)*, 2018. [Online]. Available: https://arxiv.org/abs/1704.01155
24. N. Carlini and D. Wagner, "Adversarial examples are not easily detected: Bypassing ten detection methods," in *Proc. ACM Workshop Artif. Intell. Secur. (AISec)*, 2017, pp. 3–14. [Online]. Available: https://arxiv.org/abs/1705.07263
25. J. Cohen, E. Rosenfeld, and Z. Kolter, "Certified adversarial robustness via randomized smoothing," in *Proc. Int. Conf. Mach. Learn. (ICML)*, 2019, pp. 1310–1320. [Online]. Available: https://arxiv.org/abs/1902.02918
26. S. Gowal et al., "On the effectiveness of interval bound propagation for training verifiably robust models," *arXiv preprint arXiv:1810.12715*, 2018. [Online]. Available: https://arxiv.org/abs/1810.12715
27. E. Wong and J. Z. Kolter, "Provable defenses against adversarial examples via the convex outer adversarial polytope," in *Proc. Int. Conf. Mach. Learn. (ICML)*, 2018, pp. 5286–5295. [Online]. Available: https://arxiv.org/abs/1711.00851
28. M. Cisse, P. Bojanowski, E. Grave, Y. Dauphin, and N. Usunier, "Parseval networks: Improving robustness to adversarial examples," in *Proc. Int. Conf. Mach. Learn. (ICML)*, 2017, pp. 854–863. [Online]. Available: https://arxiv.org/abs/1704.08847
29. A. S. Ross and F. Doshi-Velez, "Improving the adversarial robustness and interpretability of deep neural networks by regularizing their input gradients," in *Proc. AAAI Conf. Artif. Intell.*, 2018. [Online]. Available: https://arxiv.org/abs/1711.09404
30. D. Hendrycks, K. Lee, and M. Mazeika, "Using pre-training can improve model robustness and uncertainty," in *Proc. Int. Conf. Mach. Learn. (ICML)*, 2019, pp. 2712–2721. [Online]. Available: https://arxiv.org/abs/1901.09960
31. S.-A. Rebuffi, S. Gowal, D. A. Calian, F. Stimberg, O. Wiles, and T. Mann, "Data augmentation can improve robustness," in *Proc. Adv. Neural Inf. Process. Syst. (NeurIPS)*, 2021. [Online]. Available: https://arxiv.org/abs/2111.05328
32. W. He, J. Wei, X. Chen, N. Carlini, and D. Song, "Adversarial example defense: Ensembles of weak defenses are not strong," in *Proc. USENIX Workshop Offensive Technol. (WOOT)*, 2017. [Online]. Available: https://arxiv.org/abs/1706.04701
33. N. Papernot, P. McDaniel, X. Wu, S. Jha, and A. Swami, "Distillation as a defense to adversarial perturbations against deep neural networks," in *Proc. IEEE Symp. Secur. Privacy (SP)*, 2016, pp. 582–597. [Online]. Available: https://arxiv.org/abs/1511.04508
34. N. Carlini and D. Wagner, "Towards evaluating the robustness of neural networks," in *Proc. IEEE Symp. Secur. Privacy (SP)*, 2017, pp. 39–57. [Online]. Available: https://arxiv.org/abs/1608.04644
35. F. Tramèr, N. Carlini, W. Brendel, and A. Madry, "On adaptive attacks to adversarial example defenses," in *Proc. Adv. Neural Inf. Process. Syst. (NeurIPS)*, 2020. [Online]. Available: https://arxiv.org/abs/2002.08347
36. N. Carlini et al., "On evaluating adversarial robustness," *arXiv preprint arXiv:1902.06705*, 2019. [Online]. Available: https://arxiv.org/abs/1902.06705
37. A. Ilyas, S. Santurkar, D. Tsipras, L. Engstrom, B. Tran, and A. Madry, "Adversarial examples are not bugs, they are features," in *Proc. Adv. Neural Inf. Process. Syst. (NeurIPS)*, 2019. [Online]. Available: https://arxiv.org/abs/1905.02175
38. D. Tsipras, S. Santurkar, L. Engstrom, A. Turner, and A. Madry, "Robustness may be at odds with accuracy," in *Proc. Int. Conf. Learn. Represent. (ICLR)*, 2019. [Online]. Available: https://arxiv.org/abs/1805.12152
39. L. Rice, E. Wong, and J. Z. Kolter, "Overfitting in adversarially robust deep learning," in *Proc. Int. Conf. Mach. Learn. (ICML)*, 2020, pp. 8093–8104. [Online]. Available: https://arxiv.org/abs/2002.11569
40. F. Tramèr and D. Boneh, "Adversarial training and robustness for multiple perturbations," in *Proc. Adv. Neural Inf. Process. Syst. (NeurIPS)*, 2019. [Online]. Available: https://arxiv.org/abs/1904.13000
41. Y.-Y. Yang, C. Rashtchian, H. Zhang, R. Salakhutdinov, and K. Chaudhuri, "A closer look at accuracy vs. robustness," in *Proc. Adv. Neural Inf. Process. Syst. (NeurIPS)*, 2020. [Online]. Available: https://arxiv.org/abs/2003.02460
42. A. Raghunathan, S. M. Xie, F. Yang, J. Duchi, and P. Liang, "Understanding and mitigating the tradeoff between robustness and accuracy," in *Proc. Int. Conf. Mach. Learn. (ICML)*, 2020, pp. 7909–7919. [Online]. Available: https://arxiv.org/abs/2002.10716
43. L. Engstrom, A. Ilyas, S. Santurkar, D. Tsipras, B. Tran, and A. Madry, "Adversarial robustness as a prior for learned representations," *arXiv preprint arXiv:1906.00945*, 2019. [Online]. Available: https://arxiv.org/abs/1906.00945
