document.addEventListener("DOMContentLoaded", () => {
    const LEAD_ENDPOINT = "/api/send-lead";
    const SUCCESS_MESSAGE = "Lead enviado";
    const ERROR_MESSAGE = "Não foi possível enviar agora";

    const header = document.querySelector("[data-header]");
    const nav = document.querySelector("[data-nav]");
    const toggle = document.querySelector("[data-nav-toggle]");
    const toggleLabel = document.querySelector("[data-nav-toggle-label]");
    const closeButton = document.querySelector("[data-nav-close]");
    const navOverlay = document.querySelector("[data-nav-overlay]");
    const navLinks = [...document.querySelectorAll(".site-nav a[href^='#']")];
    const leadForm = document.querySelector("[data-lead-form]");
    const formStatus = document.querySelector("[data-form-status]");
    const sections = navLinks
        .map((link) => document.querySelector(link.getAttribute("href")))
        .filter(Boolean);

    const setHeaderState = () => {
        header?.classList.toggle("is-scrolled", window.scrollY > 12);
    };

    const setToggleA11yState = (isOpen) => {
        toggle?.setAttribute("aria-expanded", isOpen ? "true" : "false");
        toggle?.setAttribute("aria-label", isOpen ? "Fechar menu" : "Abrir menu");
        if (toggleLabel) {
            toggleLabel.textContent = isOpen ? "Fechar" : "Menu";
        }
    };

    const closeNav = () => {
        nav?.classList.remove("is-open");
        document.body.classList.remove("nav-open");
        setToggleA11yState(false);
    };

    const openNav = () => {
        nav?.classList.add("is-open");
        document.body.classList.add("nav-open");
        setToggleA11yState(true);
    };

    toggle?.addEventListener("click", () => {
        const isOpen = nav?.classList.contains("is-open");
        if (isOpen) {
            closeNav();
            return;
        }
        openNav();
    });

    navLinks.forEach((link) => {
        link.addEventListener("click", closeNav);
    });

    navOverlay?.addEventListener("click", closeNav);
    closeButton?.addEventListener("click", closeNav);

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeNav();
        }
    });

    window.addEventListener("resize", () => {
        if (window.innerWidth > 1020) {
            closeNav();
        }
    });

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;

                navLinks.forEach((link) => {
                    link.classList.toggle("is-active", link.getAttribute("href") === `#${entry.target.id}`);
                });
            });
        },
        { rootMargin: "-35% 0px -55% 0px", threshold: 0 }
    );

    sections.forEach((section) => observer.observe(section));
    setToggleA11yState(false);
    setHeaderState();
    window.addEventListener("scroll", setHeaderState, { passive: true });

    leadForm?.addEventListener("submit", async (event) => {
        event.preventDefault();

        const submitButton = leadForm.querySelector("[type='submit']");
        const defaultButtonContent = submitButton.innerHTML;

        if (!leadForm.checkValidity()) {
            leadForm.reportValidity();
            setFormStatus("Preencha os campos obrigatórios antes de enviar.", "error");
            return;
        }

        const payload = buildLeadPayload(new FormData(leadForm));
        const validationError = validatePayload(payload);

        if (validationError) {
            setFormStatus(validationError, "error");
            return;
        }

        setFormStatus("Enviando solicitação...", "pending");
        submitButton.disabled = true;
        submitButton.setAttribute("aria-busy", "true");
        submitButton.innerHTML = '<i class="ph ph-circle-notch" aria-hidden="true"></i> Enviando...';

        try {
            const response = await fetch(LEAD_ENDPOINT, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });
            const data = await response.json().catch(() => ({}));

            if (!response.ok || data.ok === false) {
                throw new Error(ERROR_MESSAGE);
            }

            setFormStatus(data.message || SUCCESS_MESSAGE, "success");
            leadForm.reset();
        } catch (error) {
            console.error("Erro ao enviar lead:", error);
            setFormStatus(ERROR_MESSAGE, "error");
        } finally {
            submitButton.disabled = false;
            submitButton.removeAttribute("aria-busy");
            submitButton.innerHTML = defaultButtonContent;
        }
    });

    function buildLeadPayload(formData) {
        const interest = cleanText(formData.get("interesse"));
        const message = cleanText(formData.get("mensagem"));
        const combinedMessage = [
            interest ? `Interesse: ${interest}` : "",
            message
        ].filter(Boolean).join("\n\n");

        return {
            name: cleanText(formData.get("nome_responsavel")),
            phone: cleanText(formData.get("telefone")),
            email: cleanText(formData.get("email")),
            studentName: cleanText(formData.get("nome_aluno")),
            studentAgeOrGrade: cleanText(formData.get("idade_crianca")),
            message: combinedMessage,
            wantsVisit: false,
            preferredVisitDay: cleanText(formData.get("dia_visita")),
            preferredVisitTime: cleanText(formData.get("periodo_visita"))
        };
    }

    function validatePayload(payload) {
        if (!payload.name) return "Informe o nome do responsável.";
        if (!payload.phone) return "Informe o telefone/WhatsApp.";
        if (digitsOnly(payload.phone).length < 10) return "Informe um telefone/WhatsApp válido com DDD.";
        if (payload.email && !isValidEmail(payload.email)) return "Informe um e-mail válido.";
        return "";
    }

    function cleanText(value) {
        return String(value || "").replace(/\s+/g, " ").trim();
    }

    function digitsOnly(value) {
        return String(value || "").replace(/\D/g, "");
    }

    function isValidEmail(value) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    }

    function setFormStatus(message, type) {
        if (!formStatus) return;
        formStatus.textContent = message;
        formStatus.dataset.status = type;
    }

    if ("serviceWorker" in navigator && window.isSecureContext) {
        window.addEventListener("load", () => {
            navigator.serviceWorker.register("/sw.js").catch((error) => {
                console.warn("Falha ao registrar service worker:", error);
            });
        });
    }
});
