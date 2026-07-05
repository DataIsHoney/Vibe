/* Entry point: register views with the router, wire nav, boot. */

import { $$ } from "./ui.js";
import { me } from "./state.js";
import { register, go } from "./router.js";
import { enterApp } from "./shell.js";
import { renderOnboarding } from "./views/onboarding.js";
import { renderHome } from "./views/home.js";
import { renderTutor } from "./views/tutor.js";
import { renderQuiz } from "./views/quiz.js";
import { renderReview } from "./views/review.js";
import { renderPaths } from "./views/paths.js";
import { renderSettings } from "./views/settings.js";

register("onboarding", renderOnboarding);
register("home", renderHome);
register("tutor", renderTutor);
register("quiz", renderQuiz);
register("review", renderReview);
register("paths", renderPaths);
register("settings", renderSettings);

$$("nav.tabs button").forEach(b => b.onclick = () => go(b.dataset.v));

if (me()) enterApp();
else go("onboarding");
