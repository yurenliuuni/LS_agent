import { HashRouter, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import { I18nProvider } from "./lib/i18n.jsx";
import Home from "./pages/Home.jsx";
import Train from "./pages/Train.jsx";
import Studio from "./pages/Studio.jsx";
import Progress from "./pages/Progress.jsx";
import Club from "./pages/Club.jsx";
import Account from "./pages/Account.jsx";
import Collection from "./pages/Collection.jsx";
import Guide from "./pages/Guide.jsx";
import About from "./pages/About.jsx";
import "./App.css";

export default function App() {
  return (
    <I18nProvider>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/train" element={<Train />} />
            <Route path="/train/:slug" element={<Train />} />
            <Route path="/time" element={<Collection kind="time" />} />
            <Route path="/time/:slug" element={<Collection kind="time" />} />
            <Route path="/focus" element={<Collection kind="focus" />} />
            <Route path="/focus/:slug" element={<Collection kind="focus" />} />
            <Route path="/studio" element={<Studio />} />
            <Route path="/progress" element={<Progress />} />
            <Route path="/club" element={<Club />} />
            <Route path="/account" element={<Account />} />
            <Route path="/guide" element={<Guide />} />
            <Route path="/about" element={<About />} />
          </Route>
        </Routes>
      </HashRouter>
    </I18nProvider>
  );
}
