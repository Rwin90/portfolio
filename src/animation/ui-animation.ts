import gsap from "gsap";

import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export class UIAnimations {
  constructor() {
    this.animateHero();

    this.animateExperience();
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

    tl.from(".hero__eyebrow", {
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
        ".hero__description",
        {
          y: 40,
          opacity: 0,
          stagger: 0.15,
          duration: 1,
        },
        "-=0.9",
      )

      .from(
        ".hero__actions",
        {
          y: 30,
          opacity: 0,
          duration: 0.8,
        },
        "-=0.7",
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
    gsap.utils.toArray(".timeline-item").forEach((item: any, index) => {
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

    //
    // SUBTLE TIMELINE FLOAT
    //
    gsap.to(".timeline", {
      y: 20,

      duration: 5,

      repeat: -1,

      yoyo: true,

      ease: "sine.inOut",
    });
  }
}
