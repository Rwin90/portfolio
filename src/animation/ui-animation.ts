import gsap from "gsap";

import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export class UIAnimations {
  constructor() {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // Everything below [data-reveal]'s hidden-until-animated CSS baseline
      // is otherwise visible by default — just snap those to rest and skip
      // every scroll-triggered tween and loop entirely.
      gsap.set("[data-reveal]", { opacity: 1, y: 0 });
      return;
    }

    this.animateHero();

    this.animateExperience();

    this.animateHeadlines();

    this.animateReveals();
  }

  //
  // HERO
  //
  animateHero() {
    const tl = gsap.timeline({
      defaults: {
        ease: "power3.out",
      },
    });

    tl.from(".hero .eyebrow", {
      y: 56,
      opacity: 0,
      duration: 0.35,
    })

      .from(
        ".hero__title",
        {
          y: 90,
          opacity: 0,
          filter: "blur(12px)",
          duration: 0.5,
        },
        "-=0.6",
      )

      .from(
        ".hero__role",
        {
          y: 40,
          opacity: 0,
          duration: 0.7,
        },
        "-=0.35",
      )

      .from(
        ".hero__description.sub",
        {
          y: 40,
          opacity: 0,
          duration: 0.7,
        },
        "-=0.55",
      )

      .from(
        ".scroll-cue",
        {
          y: 20,
          opacity: 0,
          duration: 0.6,
        },
        "-=0.4",
      );

    //
    // FLOATING TITLE MOTION
    //
    gsap.to(".hero__title", {
      y: 22,
      duration: 2,
      repeat: 2,
      yoyo: true,
      gap: 2,
      ease: "sine.inOut",
    });

    //
    // PARALLAX
    //
    gsap.to(".hero__content", {
      yPercent: 18,

      ease: "none",

      scrollTrigger: {
        trigger: ".hero",

        start: "top top",

        end: "bottom top",

        scrub: true,
      },
    });
  }

  //
  // EXPERIENCE SECTION
  //
  animateExperience() {
    //
    // LEFT SIDE
    //
    gsap.from(".experience-left", {
      opacity: 0,

      x: -80,

      duration: 1.2,

      ease: "power3.out",

      scrollTrigger: {
        trigger: ".experience",

        start: "top 70%",
      },
    });

    //
    // TIMELINE LINE GROW
    //
    gsap.from(".timeline-line", {
      scaleY: 0,

      transformOrigin: "top center",

      ease: "none",

      scrollTrigger: {
        trigger: ".timeline",

        start: "top 80%",

        end: "bottom 70%",

        scrub: true,
      },
    });

    //
    // ITEMS
    //
    gsap.utils.toArray(".timeline-item").forEach((item: any) => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: item,

          start: "top 82%",
        },
      });

      tl.from(item.querySelector(".timeline-dot"), {
        scale: 0,

        opacity: 0,

        duration: 0.5,

        ease: "back.out(2)",
      })

        .from(
          item.querySelector(".timeline-content"),
          {
            y: 60,

            opacity: 0,

            filter: "blur(10px)",

            duration: 1,

            ease: "power3.out",
          },
          "-=0.2",
        )

        .from(
          item.querySelectorAll(".tags span"),
          {
            opacity: 0,

            y: 20,

            stagger: 0.04,

            duration: 0.5,
          },
          "-=0.5",
        );
    });
  }

  //
  // SECTION HEADLINES
  //
  // Every `.section-heading` (about, skills, experience, work, testimonials,
  // contact) gets its own heavier lift-and-blur entrance, distinct from the
  // lighter fade the rest of its section gets from animateReveals() below.
  //
  animateHeadlines() {
    gsap.utils.toArray<HTMLElement>(".section-heading").forEach((heading) => {
      gsap.from(heading, {
        y: 46,
        opacity: 0,
        filter: "blur(14px)",
        duration: 0.9,
        ease: "power3.out",
        scrollTrigger: {
          trigger: heading,
          start: "top 88%",
        },
      });
    });
  }

  //
  // GENERIC SCROLL REVEALS
  //
  // Every [data-reveal] element that doesn't already get a bespoke timeline
  // above (about, skills, work rows, testimonials, contact) just fades and
  // lifts in once it enters the viewport.
  //
  animateReveals() {
    gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
      gsap.to(el, {
        opacity: 1,
        y: 0,
        duration: 0.9,
        ease: "power3.out",
        scrollTrigger: {
          trigger: el,
          start: "top 85%",
        },
      });
    });
  }
}
