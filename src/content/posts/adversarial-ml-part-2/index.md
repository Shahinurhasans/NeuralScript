---
title: 'How Can We Make a ML or DL Model Robust Against Adversarial Attacks?'
description: 'Part 2 of a series on adversarial machine learning (AML): every major way to defend a model against adversarial attacks, from adversarial training to certified defenses'
date: 2026-11-23
tags: [adversarial-ml, deep-learning, ml-security]
draft: false
---

In the [first blog](/posts/adversarial-ml-part-1/), I tried to explain that a model can be fooled or tricked by a very little change which is not even visible to  human eye But that little change can make a huge difference in performance even a cat becomes a dog, a stop sign becomes a speed-limit sign, and a "35" becomes an "85".

Today in this Blog i would like to have a little discussion about how can we make our model robust against adversarial attacks.

**Well There are Several ways to make a Model Adversaraially Robust . I will go through one by one . But before that let's have clear understanding about What does robustness actually stands for.**


Robustness means a model keeps giving the right answer even when someone deliberately tweaks the input to fool it, as long as the tweak stays within an agreed limit.A model is said adversaraially robust if no allowed change can flip its answer.

For Example: A digit classifier says "7". Robustness means that however an attacker tweaks the pixels (within the limit), it still says "7".


Another concept that needs to be clear while we talk about robustness is that "Robustness is always against what?" A company that makes safes never says "this safe cannot be opened". It says something like "this safe resists 30 minutes of drilling by a professional with these tools". For a model, we have to say the same kind of thing. This description is called the threat model.

**Threat Model:** A threat model for an ML model is a formal description of the attacks it is expected to resist. It specifies three things:

1.  **What the adversary can do**: For example, modify pixels, replace the input, or poison the training data.
2.  **What the adversary knows**: For example, model architecture and parameters, or only inputs and outputs.
3.  **What the adversary wants**: For example, cause a single misclassification, a specific misclassification, or access the model’s parameters.

So to Summerize, Robustness = the model's answer doesn't change under any allowed, deliberate perturbation, and it's only meaningful once you say which perturbations, how big, and against which attacker.

Now let's talk about the defence mechanisms:

## M-01: Adversarial training (train the model on attacks)

This is the most important and widely used method in AML. After more than ten years of research, it is still the most reliable way to make a model robust.

### The core  idea

If you can recall from previous blog, we had a student who had memorized patterns, so when one word in a question changed ("absorb" became "release"), they still picked the old answer.

Now think, How would a good teacher fix this student? By giving them practice tests full of trick questions. Every time the student falls for a trick, the teacher shows the correct answer. After enough practice, the student learns to read every word carefully instead of jumping at familiar words.

Adversarial training does exactly this. During training, we attack our own model, and then teach it the correct answer for the attacked inputs.

![Four boxes in a loop: 1. take a batch of 128 training images; 2. FGSM or PGD makes the hardest version of each image, with every pixel changing by at most epsilon; 3. update the model so it gives the correct label on these hard images; 4. the model is harder to fool, so next round the attacker must push harder. An arrow goes back to step 1.](./adversarial-training-loop.svg "Figure 2. The adversarial training loop.")

### The math behind adversaraial training (you can skip this)

Madry et al. [2] wrote adversarial training as one formula:

$$
\min_{\theta}\; \mathbb{E}_{(x,\,y)} \Big[ \max_{\|\delta\|_\infty \le \epsilon} L\big(f_\theta(x + \delta),\, y\big) \Big]
$$

It looks scary, but it is just the loop in Figure 2.

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

In one sentence: for every training image, find the worst possible attack, then train the model to be right even on that.*

There are several adversarial training mechanism.Now, which Mechanism suits better for our purpose? Let's have a look at some of them.

### FGSM adversarial training (2015)

The first version came from the same paper that introduced FGSM [1]. For each batch, it makes FGSM versions of the images and trains on a 50/50 mix of clean and attacked images.

- **Good:** cheap. FGSM needs only one extra gradient computation, so training costs about twice as much as normal.
- **Bad:** the model learns to beat FGSM, not attacks in general. A stronger attack like PGD can still break it. Worse, FGSM training can suffer from catastrophic overfitting: in the middle of training, robustness against PGD suddenly drops to almost zero, while robustness against FGSM looks perfect [3].

Back to the student: if all the trick questions in practice tests are of one kind, the student gets very good at that one kind, and is still fooled by a new kind.

### PGD adversarial training

Madry et al. [2] used this method in 2018 for the inner $\max$, usually with 7 to 10 steps and a random starting point. Since PGD is a much stronger attack, the model is trained against much harder examples.

On CIFAR-10 (small 32 × 32 color photos of 10 classes such as airplanes, cats and trucks), a normally trained network reached 95.2% clean accuracy but was almost completely broken by PGD. Their PGD-trained network reached 87.3% clean accuracy and 45.8% accuracy under PGD at ε = 8/255 [2]. Less than half sounds low, but before this, almost every defense dropped to near 0% against a strong attack.

PGD adversarial training is still the base of most of the strongest models on RobustBench, a public leaderboard of robust models [4].

- **Good:** reliable; it has survived years of attacks from many researchers.
- **Bad:** slow. Every PGD step needs one extra forward and backward pass through the network, so 10 steps make training many times more expensive.

### This adversaraial training makes the robust but another problem rises that is it is too slow for training.

  Researchers have tried to make it faster and also introduced better training goals. Let's look at some of them:

**Free adversarial training** [5]: when the model computes gradients to update its weights, the gradient with respect to the input comes almost for free. Free AT reuses it to update the attack too, and replays each batch a few times. Robustness becomes close to PGD training at close to the cost of normal training.
**Fast adversarial training** [3]: go back to FGSM, but start from a random point inside the budget instead of the original image. This simple change makes FGSM training work much better, and a robust CIFAR-10 model can be trained in minutes instead of hours or days. The danger of catastrophic overfitting is still there, so you have to check PGD accuracy during training and stop early if it collapses.

### Better training goals: TRADES, MART and AWP

Standard PGD training gives the model one simple rule: *"get the attacked image right."* Researchers soon noticed we can do better by changing what we ask the model to optimize during training.

Think of it like coaching a student for a tricky exam. Instead of only grading their final answer on trick questions, you can coach them in three smarter ways:

#### 1. TRADES:
TRADES splits the training goal into two clear parts:
1. **Accuracy:** Get the clean (normal) image right.
2. **Stability:** Give the same prediction on both the clean image and the attacked image.

A single knob called $\beta$ ("beta") controls how much you care about part (2):
- **Small $\beta$:** higher clean accuracy, but easier to fool.
- **Large $\beta$:** stronger robustness, but slightly lower clean accuracy.

In short, TRADES turns the robustness–accuracy trade-off into a simple dial. On CIFAR-10 at $\varepsilon = 8/255$, it reported 84.9% clean accuracy and 56.6% robust accuracy [6].

#### 2. MART :[7]:
Not all training images are equally easy. Some images are already misclassified even before an attack happens. MART (*Misclassification Aware Adversarial Training*) checks which clean images the model still gets wrong and puts extra weight on defending those weak spots-just like a student spending more study time on the chapters they keep failing.

#### 3. AWP [8]
Normal adversarial training only perturbs the input image $x$. AWP (*Adversarial Weight Perturbation*) goes one step further: during training, it also nudges the model's own weights slightly in the worst direction and trains the model to stay accurate anyway. This forces the model into a "flatter," steadier region so its robustness holds up better on unseen test images.



> [!WARNING] A quick caution from this area
> Another method called adversarial logit pairing [9] initially reported very strong robustness on ImageNet, but a stronger follow-up evaluation showed it was much weaker than claimed [10]. Always remember our rule from Section 1: *a defense is only as good as the strongest attack it has been tested against.*

###  More data helps a lot

Robust learning needs more data than normal learning [11]. Adding extra unlabeled images [12], and later millions of images generated by diffusion models [13], made a huge difference. In 2023, a model trained this way reached 70.69% robust accuracy on CIFAR-10 at ε = 8/255 under AutoAttack, a strong standard set of attacks [13]. Compare that with 45.8% in 2018.

###  Ensemble adversarial training

In a transfer attack, the attacker cannot see our model, so they attack their own copy and hope the attack works on ours too. Ensemble adversarial training [14] trains the model on adversarial examples made on several other, already-trained models. This helps a lot against transfer attacks, but not against an attacker who can see our model.

###  What adversarial training does to the model

Normal training only cares that each training image is on the correct side of the decision boundary. Adversarial training asks for more: the whole square of allowed changes around each image must be on the correct side. This pushes the boundary away from the images and leaves a safety margin.

![Two panels with cat points in blue and dog points in orange, each surrounded by a dashed square showing the allowed change. Left, normal training: the boundary bends close to one cat and one dog and passes through their squares, which are marked in red. Right, adversarial training: the boundary sits in the middle of the gap and every square is fully on its own side](./robust-boundary.svg "Figure 3. Left: after normal training, every point is on the correct side, but the boundary passes through some of the dashed squares, so a small allowed push flips those answers. Right: adversarial training moves the boundary until every square is on its own side. Illustration, not the output of a real model.")

## M-02: Clean the input before the model sees it

The idea: adversarial noise is very finely tuned. If we "wash" the input before giving it to the model, maybe the noise falls off, like ironing a crumpled shirt before wearing it.

Ways to clean the input:

**Simple image processing:** JPEG compression, reducing the number of colors (bit-depth reduction), and other transformations [15].
**Randomness:** randomly resize the image and add random padding before classifying it [16].
**Denoiser networks:** a separate network trained to remove adversarial noise [17], [18].
**Generative models:** project the input onto images that a GAN can draw [19], or add noise and let a diffusion model redraw a clean version [20].

![A pipeline: an adversarial image of the digit 7 with hidden noise goes into a cleaner (JPEG compression, bit-depth reduction, denoiser network, or GAN or diffusion model), which outputs a clean 7. The same model, not retrained, then says 7. A red box explains the weakness: if the attacker knows the cleaner is there, they attack cleaner plus model as one big model](./input-purification.svg "Figure 4. Input purification puts a cleaner in front of the model. Its weakness is the adaptive attack: an attacker who knows about the cleaner designs noise that survives it.")

- **Good:** works in front of any model, with no retraining. Often costs little clean accuracy.
- **Bad:** most simple cleaners were broken once the attacker attacked "cleaner + model" together [21]. If the cleaner is not differentiable, the attacker pretends it is the identity function when computing gradients (a trick called BPDA). If the cleaner is random, the attacker averages over many random versions (a trick called EOT). Diffusion-based purification holds up much better, but it is very slow and hard to evaluate correctly.


##   M-03 : Detect the attack and refuse to answer

Instead of answering correctly, the model can just say "this input looks suspicious, I will not answer". It is like a shopkeeper checking a banknote under UV light before accepting it.

- **Detector networks:** a second, small network trained to tell normal inputs from adversarial ones [22].
- **Feature squeezing** [23]: ask the model twice, once with the original input and once with a "squeezed" version (fewer colors, slightly blurred). For a normal image, both answers are almost the same. For an adversarial image, the answers are often very different, so the system raises an alarm.
- **Statistical tests:** check whether the input or the model's internal activations look different from normal data.

- **Good:** useful as an alarm in a real system, for example to send suspicious inputs to a person.
- **Bad:** an attacker who knows about the detector simply attacks the model and the detector at the same time. Carlini and Wagner bypassed ten different detection methods this way [24]. A detector alone is not a defense.

##  M-04: Certified defenses 
All the methods so far are tested: "we tried strong attacks, and they failed". But tomorrow someone may invent a stronger attack. A certified defense gives a mathematical proof instead: **"for this input, no change smaller than R can change the answer."**

###  Randomized smoothing

This is the most popular certified method [25], and it is surprisingly simple:

1. Train the model on images with random noise added.
2. To classify an input, make many noisy copies of it (for example 1,000), and classify each copy.
3. The final answer is the majority vote.
4. The bigger the majority, the bigger the guaranteed radius R.

Why does this work? A tiny change to the input can only shift the "cloud" of noisy copies a tiny bit, so it can only change a few votes. If the winner is far ahead, a few votes cannot change the result, and the math tells us exactly how far ahead is enough.

![Left: an input image is copied 1,000 times with random noise added; each copy goes through a model trained on noise; votes are cat 920, dog 60, fox 20, so the final answer is cat. Right: the input point sits inside the cat region with a dashed circle of radius R around it, fully inside the cat region](./randomized-smoothing.svg "Figure 5. Randomized smoothing. Left: classify many noisy copies and take the majority vote. Right: the strength of the vote gives a radius R, and it is proven that no change smaller than R can flip the answer. The vote counts are made up for illustration.")

On ImageNet, randomized smoothing reached 49% certified accuracy for changes with L2 size up to 0.5 [25]. That means for about half of the test images, it is proven that no such change can fool the model.

###  Bound propagation: IBP and convex relaxation

Instead of searching for the worst attack, these methods send the whole box of allowed inputs through the network at once and compute the smallest and largest value each output can take. If the smallest possible score of the correct class is still bigger than the largest possible score of every other class, no attack inside the box can work. Interval bound propagation (IBP) [26] computes simple, fast bounds; convex relaxation [27] computes tighter but more expensive ones. The model is then trained to make these proofs succeed.

### Lipschitz networks

A Lipschitz constant is a speed limit for the model: it says how much the output can change when the input changes by one unit. Methods like Parseval networks [28] build this speed limit into the network. If the correct class is ahead by more than "speed limit × ε", no change of size ε can catch up.

- **Good:** real guarantees, not just "no attack has worked so far".
- **Bad:** the guaranteed radius is usually small, clean accuracy is clearly lower, and randomized smoothing needs thousands of forward passes for each prediction.

##  M-05: Make the model naturally smoother

These methods try to make the model less sensitive to small changes in general. They usually work best together with adversarial training, not alone.

- **Input gradient regularization** [29]: during training, punish the model when its output changes quickly with tiny input changes.
- **Lipschitz and spectral limits:** keep the weights from becoming too large, which limits how much a small change can grow inside the network.
- **Bigger models:** Madry et al. found that small networks cannot become robust at all, while wider networks can [2].
- **Pre-training** on a large dataset before adversarial training improves robustness [30].
- **Data augmentation**, done the right way, also helps [31].
- **Ensembles** (several models voting) help a little, but combining several weak defenses does not give a strong one [32].

## M-06: Protect the system around the model

A model is always part of a bigger system, and the system can help too:

- **Show less.** Return only the final label, not the confidence scores. Many black-box attacks use the scores to find their way.
- **Limit and watch queries.** Black-box attacks often need thousands of queries. A user who sends thousands of almost identical images is suspicious.
- **Use more than one source of information.** For the speed-limit sign from Part 1, a car could compare what the camera reads with a map of known speed limits. An "85" on a city street should not be trusted.
- **Keep a person in the loop** for high-stakes decisions, like the heart disease example from Part 1.
- **Protect the training data** from poisoning, like what happened to Tay.

## A practical experiment

### Problem statement

In Part 1, our MNIST digit classifier (a two-layer MLP with 256 and 128 hidden neurons across 10 classes) achieved **97.8% accuracy** on clean images, but collapsed to **10.6% / 0.5% under FGSM** and **5.0% / 0.0% under PGD** at attack budgets of $\varepsilon = 0.10 \text{ and } 0.20$.

Can we take that exact same vulnerable model and make it robust against the FGSM and PGD attacks ($\varepsilon = 0.10 \text{ and } 0.20$) using all the defense methods discussed in this blog and what does that robustness cost on normal images?

### Results

![Grouped bar chart comparing the vulnerable baseline MLP against 13 defense methods on MNIST under Clean, FGSM (0.10, 0.20), and PGD (0.10, 0.20) attacks](./all-methods-comparison.png "Figure 6. Head-to-head comparison of the vulnerable baseline MLP and 13 defense methods on MNIST test digits under Clean, FGSM (ε = 0.10, 0.20), and PGD (ε = 0.10, 0.20) attacks (run on an NVIDIA L4 GPU).")

![Two-panel bar chart showing how gaining robustness reduces clean accuracy (left) and the exact percentage points of normal accuracy lost compared to the 97.8% baseline (right)](./robustness-cost.png "Figure 7. The cost of robustness on normal performance: gaining resistance against strong PGD attacks (ε = 0.20) causes clean accuracy on normal images to drop by 6.1 to 27.2 percentage points compared to the 97.8% baseline.")

### Key findings

1. **The baseline model is completely vulnerable:** Without a defense, clean accuracy is 97.8%, but under attack it drops to 10.6% (FGSM) and 5.0% (PGD) at $\varepsilon = 0.10$, and collapses to 0.5% (FGSM) and 0.0% (PGD) at $\varepsilon = 0.20$.
2. **FGSM adversarial training gives a false sense of security:** On FGSM at $\varepsilon = 0.20$, `FGSM-AT` jumps from 0.5% to 84.4%. Yet against multi-step PGD at $\varepsilon = 0.20$, it collapses to 2.8% (catastrophic overfitting). Adding a random starting point in `Fast-AT` fixes this collapse and lifts PGD ($\varepsilon = 0.20$) accuracy from 2.8% to 38.7% (and 67.8% at $\varepsilon = 0.10$) in just 2.7s of training.
3. **TRADES, MART, and PGD-AT give the strongest resistance against hard attacks:** Under the toughest attack ($\text{PGD at } \varepsilon = 0.20$), `TRADES` achieves the highest robust accuracy of all 14 models ( 59.9%, and 80.9% at $\varepsilon = 0.10$), followed by `MART` (49.9%), `PGD-AT` (47.1% ), and `Ensemble-AT` (43.5%, and 81.8% at $\varepsilon = 0.10$).
4. **Input cleaning and detection help at moderate budgets without retraining the classifier:** `Input Cleaning` (bit-depth reduction + denoiser) keeps 97.7% clean accuracy and holds 64.9% / 40.0% under PGD at $\varepsilon = 0.10 / 0.20$. `Feature Squeezing` holds 64.8% under PGD at $\varepsilon = 0.10$ with zero training time (`0.0s`), but drops to 8.8% at $\varepsilon = 0.20$ where strong multi-step attacks overwhelm simple squeezing.
5. **Certified and smoothness methods:** **`Randomized Smoothing`** lifts PGD ($\varepsilon = 0.10$) accuracy from 5.0% to 53.0% while keeping 97.1% clean accuracy, and `Lipschitz Spectral Norm` holds 68.5% / 38.4% under PGD at $\varepsilon = 0.10 / 0.20$.
6. **Robustness minimizes normal (clean) performance:** As Figure 7 clearly shows, forcing our small MLP to resist strong PGD attacks ($\varepsilon = 0.20$) reduces its accuracy on completely normal, unattacked images and increases training time up to $5.5\times$:

| Model | Clean Accuracy (Normal Images) | Clean Accuracy Lost | Robust Accuracy (PGD $\varepsilon = 0.20$) | Training Time (NVIDIA L4) |
| :-- | :--: | :--: | :--: | :--: |
| **Baseline (No Defense)** | **97.8%** | 0.0% | 0.0% | 2.1s |
| **TRADES** | 91.7% | **−6.1%** | **59.9%** | 11.6s |
| **PGD-AT** | 87.6% | **−10.2%** | 47.1% | 8.6s |
| **Lipschitz SpecNorm** | 87.2% | **−10.6%** | 38.4% | 8.1s |
| **Fast-AT** | 78.5% | **−19.3%** | 38.7% | 2.7s |
| **MART** | 77.9% | **−19.9%** | 49.9% | 10.0s |
| **AWP** | 70.6% | **−27.2%** | 38.4% | 10.5s |

To survive strong attacks, our model sacrificed between 6.1 and 27.2 percentage points of normal accuracy.



If you look at the result table or graphs, you will notice that all the robust models sacrifised some accuracy on normal inputs. What is the actual reason behind it?
Also can we design and train a model that stays both highly accurate on normal data and robust under attack?

In the next part i will try to figure out the solution of this questions. 



## Code


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
