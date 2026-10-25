/* IronForge interactive behavior */


/* =========================================================
   MOBILE MENU
========================================================= */

const menuToggle = document.getElementById("menuToggle");
const navMenu = document.getElementById("navMenu");

function setMenuState(isOpen) {

    if (!menuToggle || !navMenu) return;

    navMenu.classList.toggle("open", isOpen);
    document.body.classList.toggle("menu-open", isOpen);

    menuToggle.setAttribute(
        "aria-expanded",
        String(isOpen)
    );

    const icon = menuToggle.querySelector("i");

    if (icon) {

        icon.classList.toggle(
            "fa-bars",
            !isOpen
        );

        icon.classList.toggle(
            "fa-xmark",
            isOpen
        );

    }
}


if (menuToggle && navMenu) {

    menuToggle.setAttribute(
        "aria-expanded",
        "false"
    );

    menuToggle.addEventListener("click", () => {

        setMenuState(
            !navMenu.classList.contains("open")
        );

    });


    navMenu.querySelectorAll("a").forEach(link => {

        link.addEventListener("click", () => {

            setMenuState(false);

        });

    });


    window.addEventListener("resize", () => {

        if (window.innerWidth > 900) {

            setMenuState(false);

        }

    });

}


/* =========================================================
   THEME TOGGLE
========================================================= */

const themeToggle =
    document.getElementById("themeToggle");


function updateThemeIcon() {

    if (!themeToggle) return;

    const icon =
        themeToggle.querySelector("i");

    if (!icon) return;

    const isLight =
        document.body.classList.contains(
            "light-mode"
        );

    icon.classList.toggle(
        "fa-moon",
        !isLight
    );

    icon.classList.toggle(
        "fa-sun",
        isLight
    );

}


if (themeToggle) {

    if (
        localStorage.getItem(
            "ironforge-theme"
        ) === "light"
    ) {

        document.body.classList.add(
            "light-mode"
        );

    }

    updateThemeIcon();


    themeToggle.addEventListener(
        "click",
        () => {

            document.body.classList.toggle(
                "light-mode"
            );

            localStorage.setItem(
                "ironforge-theme",

                document.body.classList.contains(
                    "light-mode"
                )
                    ? "light"
                    : "dark"
            );

            updateThemeIcon();

        }
    );

}


/* =========================================================
   NAVBAR SCROLL
========================================================= */

const navbar =
    document.querySelector(".navbar");

const sections =
    document.querySelectorAll(
        "section[id]"
    );

const navLinks =
    document.querySelectorAll(
        ".nav-menu a"
    );


function handleNavbarScroll() {

    if (navbar) {

        navbar.classList.toggle(
            "scrolled",
            window.scrollY > 50
        );

    }

}


function updateActiveNav() {

    let currentSection = "";


    sections.forEach(section => {

        const sectionTop =
            section.offsetTop - 150;


        if (
            window.scrollY >= sectionTop &&
            window.scrollY <
                sectionTop +
                section.offsetHeight
        ) {

            currentSection =
                section.id;

        }

    });


    navLinks.forEach(link => {

        link.classList.toggle(
            "active",
            link.getAttribute("href") ===
                `#${currentSection}`
        );

    });

}


window.addEventListener(
    "scroll",
    handleNavbarScroll,
    { passive: true }
);


window.addEventListener(
    "scroll",
    updateActiveNav,
    { passive: true }
);


handleNavbarScroll();


/* =========================================================
   BACK TO TOP
========================================================= */

const backToTop =
    document.getElementById(
        "backToTop"
    );


if (backToTop) {

    window.addEventListener(
        "scroll",
        () => {

            backToTop.classList.toggle(
                "show",
                window.scrollY > 500
            );

        },
        { passive: true }
    );


    backToTop.addEventListener(
        "click",
        () => {

            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });

        }
    );

}


/* =========================================================
   SCROLL REVEAL ANIMATION
========================================================= */

const revealElements =
    document.querySelectorAll(
        ".section-header, .about-grid, .program-card, .class-row, .trainer-card, .price-card, .testimonial-slider, .contact-grid"
    );


revealElements.forEach(element => {

    element.classList.add("reveal");

});


const revealObserver =
    new IntersectionObserver(
        (entries, observer) => {

            entries.forEach(entry => {

                if (entry.isIntersecting) {

                    entry.target.classList.add(
                        "visible"
                    );

                    observer.unobserve(
                        entry.target
                    );

                }

            });

        },
        {
            threshold: 0.12
        }
    );


revealElements.forEach(element => {

    revealObserver.observe(element);

});


/* =========================================================
   BILLING TOGGLE
========================================================= */

const billingToggle =
    document.getElementById(
        "billingToggle"
    );

const monthlyPrices =
    document.querySelectorAll(
        ".monthly-price"
    );

const yearlyPrices =
    document.querySelectorAll(
        ".yearly-price"
    );


if (billingToggle) {

    billingToggle.addEventListener(
        "click",
        () => {

            const isYearly =
                billingToggle.classList.toggle(
                    "yearly"
                );


            monthlyPrices.forEach(price => {

                price.style.display =
                    isYearly
                        ? "none"
                        : "inline";

            });


            yearlyPrices.forEach(price => {

                price.style.display =
                    isYearly
                        ? "inline"
                        : "none";

            });

        }
    );

}


/* =========================================================
   CLASS SCHEDULE
========================================================= */

const dayButtons =
    document.querySelectorAll(
        ".day-btn"
    );

const scheduleList =
    document.getElementById(
        "scheduleList"
    );


const scheduleData = {

    monday: [
        [
            "06:00",
            "AM",
            "Power Strength",
            "Arjun Kumar",
            "INTERMEDIATE"
        ],
        [
            "08:00",
            "AM",
            "HIIT Burn",
            "Sarah Wilson",
            "ALL LEVELS"
        ],
        [
            "06:00",
            "PM",
            "Boxing Fundamentals",
            "Michael Reed",
            "BEGINNER"
        ],
        [
            "07:30",
            "PM",
            "Functional Training",
            "David Lee",
            "ADVANCED"
        ]
    ],

    tuesday: [
        [
            "06:30",
            "AM",
            "Functional Training",
            "David Lee",
            "ALL LEVELS"
        ],
        [
            "08:30",
            "AM",
            "Strength Basics",
            "Arjun Kumar",
            "BEGINNER"
        ],
        [
            "05:30",
            "PM",
            "HIIT Burn",
            "Sarah Wilson",
            "INTERMEDIATE"
        ],
        [
            "07:00",
            "PM",
            "Boxing Camp",
            "Michael Reed",
            "ADVANCED"
        ]
    ],

    wednesday: [
        [
            "06:00",
            "AM",
            "Power Strength",
            "Arjun Kumar",
            "ADVANCED"
        ],
        [
            "07:30",
            "AM",
            "Mobility Flow",
            "David Lee",
            "ALL LEVELS"
        ],
        [
            "06:00",
            "PM",
            "HIIT Burn",
            "Sarah Wilson",
            "ALL LEVELS"
        ],
        [
            "08:00",
            "PM",
            "Boxing Fundamentals",
            "Michael Reed",
            "BEGINNER"
        ]
    ],

    thursday: [
        [
            "06:30",
            "AM",
            "Strength Basics",
            "Arjun Kumar",
            "BEGINNER"
        ],
        [
            "08:00",
            "AM",
            "HIIT Burn",
            "Sarah Wilson",
            "INTERMEDIATE"
        ],
        [
            "05:30",
            "PM",
            "Functional Training",
            "David Lee",
            "ALL LEVELS"
        ],
        [
            "07:30",
            "PM",
            "Power Strength",
            "Arjun Kumar",
            "ADVANCED"
        ]
    ],

    friday: [
        [
            "06:00",
            "AM",
            "Power Strength",
            "Arjun Kumar",
            "INTERMEDIATE"
        ],
        [
            "08:30",
            "AM",
            "HIIT Burn",
            "Sarah Wilson",
            "ALL LEVELS"
        ],
        [
            "06:00",
            "PM",
            "Boxing Camp",
            "Michael Reed",
            "ADVANCED"
        ],
        [
            "07:30",
            "PM",
            "Functional Training",
            "David Lee",
            "ALL LEVELS"
        ]
    ],

    saturday: [
        [
            "07:00",
            "AM",
            "Weekend HIIT",
            "Sarah Wilson",
            "ALL LEVELS"
        ],
        [
            "09:00",
            "AM",
            "Strength Training",
            "Arjun Kumar",
            "INTERMEDIATE"
        ],
        [
            "05:00",
            "PM",
            "Boxing Fundamentals",
            "Michael Reed",
            "BEGINNER"
        ],
        [
            "06:30",
            "PM",
            "Athletic Flow",
            "David Lee",
            "ADVANCED"
        ]
    ]

};


function createSchedule(day) {

    if (
        !scheduleList ||
        !scheduleData[day]
    ) {
        return;
    }


    scheduleList.innerHTML = "";


    scheduleData[day].forEach(
        ([time, period, title, trainer, level]) => {

            const row =
                document.createElement(
                    "div"
                );


            row.className =
                "class-row";


            row.innerHTML = `
                <div class="class-time">
                    <strong>${time}</strong>
                    <span>${period}</span>
                </div>

                <div class="class-info">
                    <h3>${title}</h3>

                    <span>
                        <i class="fa-solid fa-user"></i>
                        ${trainer}
                    </span>
                </div>

                <span class="class-level">
                    ${level}
                </span>

                <button class="book-btn">
                    Book Class
                </button>
            `;


            row
                .querySelector(".book-btn")
                .addEventListener(
                    "click",
                    () => {

                        alert(
                            `Great choice! "${title}" has been selected.`
                        );

                    }
                );


            scheduleList.appendChild(row);

        }
    );

}


dayButtons.forEach(button => {

    button.addEventListener(
        "click",
        () => {

            dayButtons.forEach(
                dayButton => {

                    dayButton.classList.remove(
                        "active"
                    );

                }
            );


            button.classList.add(
                "active"
            );


            createSchedule(
                button.dataset.day
            );

        }
    );

});


createSchedule("monday");


/* =========================================================
   TESTIMONIALS
========================================================= */

const testimonials = [

    {
        text:
            '"IronForge completely changed the way I look at fitness. The trainers pushed me beyond what I thought was possible."',

        name:
            "Aditya Kumar",

        duration:
            "Member for 2 years",

        initials:
            "AK"
    },

    {
        text:
            '"The atmosphere here is incredible. I became stronger, more confident and much more disciplined."',

        name:
            "Priya Sharma",

        duration:
            "Member for 1 year",

        initials:
            "PS"
    },

    {
        text:
            '"I joined for weight loss but stayed because of the amazing community and trainers. Best decision I\'ve made."',

        name:
            "Rahul Anand",

        duration:
            "Member for 3 years",

        initials:
            "RA"
    },

    {
        text:
            '"Every workout feels meaningful. The trainers actually care about your progress and keep you motivated."',

        name:
            "Meera Krishnan",

        duration:
            "Member for 8 months",

        initials:
            "MK"
    }

];


let testimonialIndex = 0;


const testimonialContent =
    document.getElementById(
        "testimonialContent"
    );


function showTestimonial(index) {

    if (!testimonialContent) return;


    const testimonial =
        testimonials[index];


    testimonialContent.style.opacity =
        "0";


    setTimeout(() => {

        testimonialContent.innerHTML = `

            <div class="quote-icon">
                <i class="fa-solid fa-quote-left"></i>
            </div>

            <p class="testimonial-text">
                ${testimonial.text}
            </p>

            <div class="member">

                <div class="member-avatar">
                    ${testimonial.initials}
                </div>

                <div>
                    <strong>
                        ${testimonial.name}
                    </strong>

                    <span>
                        ${testimonial.duration}
                    </span>
                </div>

            </div>
        `;


        testimonialContent.style.opacity =
            "1";

    }, 200);

}


const nextTestimonial =
    document.getElementById(
        "nextTestimonial"
    );


const prevTestimonial =
    document.getElementById(
        "prevTestimonial"
    );


if (nextTestimonial) {

    nextTestimonial.addEventListener(
        "click",
        () => {

            testimonialIndex =
                (testimonialIndex + 1) %
                testimonials.length;

            showTestimonial(
                testimonialIndex
            );

        }
    );

}


if (prevTestimonial) {

    prevTestimonial.addEventListener(
        "click",
        () => {

            testimonialIndex =
                (
                    testimonialIndex -
                    1 +
                    testimonials.length
                ) %
                testimonials.length;

            showTestimonial(
                testimonialIndex
            );

        }
    );

}


/* =========================================================
   CONTACT FORM
========================================================= */

const contactForm =
    document.getElementById(
        "contactForm"
    );


const formMessage =
    document.getElementById(
        "formMessage"
    );


if (
    contactForm &&
    formMessage
) {

    contactForm.addEventListener(
        "submit",
        event => {

            event.preventDefault();


            const name =
                document
                    .getElementById("name")
                    .value
                    .trim();


            const email =
                document
                    .getElementById("email")
                    .value
                    .trim();


            const message =
                document
                    .getElementById("message")
                    .value
                    .trim();


            if (
                !name ||
                !email ||
                !message
            ) {

                formMessage.textContent =
                    "Please fill all required fields.";

                return;

            }


            formMessage.textContent =
                `Thanks ${name}! Your message has been received.`;


            contactForm.reset();

        }
    );

}


/* =========================================================
   SMOOTH SCROLL
========================================================= */

document
    .querySelectorAll(
        'a[href^="#"]'
    )
    .forEach(link => {

        link.addEventListener(
            "click",
            event => {

                const targetId =
                    link.getAttribute(
                        "href"
                    );


                if (
                    !targetId ||
                    targetId === "#"
                ) {
                    return;
                }


                const target =
                    document.querySelector(
                        targetId
                    );


                if (target) {

                    event.preventDefault();


                    target.scrollIntoView({
                        behavior: "smooth"
                    });

                }

            }
        );

    });


/* =========================================================
   IMAGE FALLBACK
========================================================= */

document
    .querySelectorAll("img")
    .forEach(image => {

        image.addEventListener(
            "error",
            () => {

                image.style.background =
                    "linear-gradient(135deg, #222, #111)";

                image.style.minHeight =
                    "200px";

                image.alt =
                    "Image unavailable";

            }
        );

    });


/* =========================================================
   PAGE LOAD
========================================================= */

window.addEventListener(
    "load",
    () => {

        document.body.classList.add(
            "loaded"
        );

        updateActiveNav();

    }
);


/* =========================================================
   KEYBOARD
========================================================= */

document.addEventListener(
    "keydown",
    event => {

        if (event.key === "Escape") {

            setMenuState(false);

        }

    }
);


/* =========================================================
   MEMBER LOGIN + BACKEND CONNECTION
========================================================= */

/*
    IMPORTANT:
    Backend:
    http://127.0.0.1:5000

    API:
    http://127.0.0.1:5000/api
*/

const API_BASE_URL =
    "http://127.0.0.1:5000/api";


const loginBtn =
    document.getElementById(
        "loginBtn"
    );


const loginModal =
    document.getElementById(
        "loginModal"
    );


const loginClose =
    document.getElementById(
        "loginClose"
    );


const loginForm =
    document.getElementById(
        "loginForm"
    );


const loginMessage =
    document.getElementById(
        "loginMessage"
    );


/* =========================================================
   OPEN LOGIN MODAL
========================================================= */

if (
    loginBtn &&
    loginModal
) {

    loginBtn.addEventListener(
        "click",
        () => {

            loginModal.classList.add(
                "active"
            );

            document.body.style.overflow =
                "hidden";

        }
    );

}


/* =========================================================
   CLOSE LOGIN MODAL
========================================================= */

function closeLoginModal() {

    if (!loginModal) return;


    loginModal.classList.remove(
        "active"
    );


    document.body.style.overflow =
        "";


    if (loginForm) {

        loginForm.reset();

    }


    if (loginMessage) {

        loginMessage.textContent =
            "";

    }

}


if (loginClose) {

    loginClose.addEventListener(
        "click",
        closeLoginModal
    );

}


/* =========================================================
   CLOSE MODAL BY CLICKING OUTSIDE
========================================================= */

if (loginModal) {

    loginModal.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                loginModal
            ) {

                closeLoginModal();

            }

        }
    );

}


/* =========================================================
   LOGIN FORM
========================================================= */

if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const email =
                document
                    .getElementById(
                        "loginEmail"
                    )
                    .value
                    .trim();


            const password =
                document
                    .getElementById(
                        "loginPassword"
                    )
                    .value;


            if (
                !email ||
                !password
            ) {

                loginMessage.textContent =
                    "Please enter email and password.";

                return;

            }


            /* Loading message */

            loginMessage.textContent =
                "Connecting to IronForge...";


            try {

                console.log(
                    "Sending login request to:",
                    `${API_BASE_URL}/auth/login`
                );


                const response =
                    await fetch(
                        `${API_BASE_URL}/auth/login`,
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify({
                                    email:
                                        email,

                                    password:
                                        password
                                })
                        }
                    );


                console.log(
                    "Server response:",
                    response.status
                );


                let data;


                try {

                    data =
                        await response.json();

                } catch (jsonError) {

                    throw new Error(
                        "Server returned an invalid response."
                    );

                }


                /* Login failed */

                if (!response.ok) {

                    throw new Error(
                        data.message ||
                        "Login failed."
                    );

                }


                /* =================================================
                   LOGIN SUCCESS
                ================================================= */


                /* Save JWT token */

                localStorage.setItem(
                    "ironforgeToken",
                    data.token
                );


                /* Save user information */

                localStorage.setItem(
                    "ironforgeUser",
                    JSON.stringify(
                        data.user
                    )
                );


                console.log(
                    "Login successful:",
                    data
                );


                /* Success message */

                loginMessage.textContent =
                    `Welcome ${data.user.name}!`;


                loginMessage.style.color =
                    "#00ff88";

/* Redirect user based on their role */

setTimeout(() => {
    const user = data.user;

    if (!user) {
        loginMessage.textContent =
            "Login successful, but user details are missing.";
        return;
    }

    const role = String(user.role || "").toLowerCase();

    if (role === "admin") {
        window.location.href = "admin-dashboard.html";
    } else {
        window.location.href = "member-dashboard.html";
    }
}, 1000);


            } catch (error) {

                console.error(
                    "IronForge login error:",
                    error
                );


                /*
                    If browser cannot reach backend,
                    show a clearer message.
                */

                if (
                    error instanceof
                    TypeError
                ) {

                    loginMessage.textContent =
                        "Cannot connect to IronForge server.";

                } else {

                    loginMessage.textContent =
                        error.message ||
                        "Unable to login.";

                }


                loginMessage.style.color =
                    "#ff4500";

            }

        }
    );

}