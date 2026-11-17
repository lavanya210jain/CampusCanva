import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Layers,
  Leaf,
  MapPin,
  Clock,
  LockKeyhole,
  Users,
  Image as ImageIcon,
  Check,
  Heart,
  Sparkles,
} from "lucide-react";
import { ThemeToggle } from "../components/common/ThemeToggle";
import { CampusIllustration } from "../components/common/CampusIllustration";
import { DatabaseStatus } from "../components/common/DatabaseStatus";
import { useAuth } from "../context/AuthContext";
const features = [
  {
    id: "spaces",
    icon: MapPin,
    eyebrow: "MAKE ROOM FOR YOUR MEMORIES",
    title: "One space. A hundred stories.",
    description:
      "The fest, the society trip, the everyday chai break. Keep the photos, people and little details together.",
    action: "Explore memory spaces",
    path: "/explore",
  },
  {
    id: "capsules",
    icon: Clock,
    eyebrow: "A LITTLE SOMETHING FOR LATER",
    title: "Send a memory to your future self.",
    description:
      "Save the moments you aren’t ready to say goodbye to. Pick an opening date and let the reunion come to you.",
    action: "Discover time capsules",
    path: "/time-capsules",
  },
  {
    id: "sharing",
    icon: LockKeyhole,
    eyebrow: "YOUR PEOPLE. YOUR CHOICE.",
    title: "Some stories are just for your circle.",
    description:
      "Keep a space private for your collaborators, or make it public for the campus. You choose who gets to contribute.",
    action: "Create your own space",
    path: "/my-spaces",
  },
] as const;
export const WelcomeLanding = () => {
  const [active, setActive] = useState(0);
  const { isAuthenticated } = useAuth();
  const feature = features[active];
  return (
    <div className="welcome-page">
      <header className="welcome-header">
        <div className="welcome-nav">
          <Link to="/" className="welcome-brand">
            <span className="brand-mark">
              <Layers size={21} />
            </span>
            <span>
              CampusCanva
              <span className="brand-subtitle">
                A place for your college days
              </span>
            </span>
          </Link>
          <div className="welcome-nav-actions">
            <ThemeToggle />
            <Link to="/login" className="welcome-signin">
              Sign in
            </Link>
            <Link
              to={isAuthenticated ? "/dashboard" : "/register"}
              className="welcome-button welcome-header-cta"
            >
              {isAuthenticated ? "My campus" : "Join the story"}
              <ArrowUpRight size={15} />
            </Link>
          </div>
        </div>
      </header>
      <main>
        <section className="welcome-hero">
          <div className="hero-copy">
            <p className="welcome-eyebrow">
              <Leaf size={15} /> MADE FOR THE DAYS THAT MATTER
            </p>
            <h1>
              College happens once.
              <br />
              <em>Keep the good parts.</em>
            </h1>
            <p className="hero-description">
              Big celebrations. Familiar corners. Your favourite people. Give
              your campus memories a home you can always come back to.
            </p>
            <div className="hero-actions">
              <Link
                to={isAuthenticated ? "/dashboard" : "/register"}
                className="welcome-button"
              >
                {isAuthenticated
                  ? "Open my campus"
                  : "Start your memory collection"}
                <ArrowRight size={17} />
              </Link>
              <a href="#features" className="welcome-text-link">
                Take a little look <ArrowUpRight size={16} />
              </a>
            </div>
            <div className="hero-reassurance">
              <span>
                <Check size={14} /> Photos & stories
              </span>
              <span>
                <Check size={14} /> Your circle
              </span>
              <span>
                <Check size={14} /> Memories for later
              </span>
            </div>
          </div>
          <div
            className="hero-board"
            aria-label="Illustrated campus memory board"
          >
            <div className="board-orbit orbit-one" />
            <div className="board-orbit orbit-two" />
            <div className="board-note note-top">
              <span className="note-dot" /> a little nostalgia, saved.
            </div>
            <div className="memory-polaroid">
              <div className="polaroid-tape" />
              <CampusIllustration />
              <div className="polaroid-caption">
                <span>Our kind of place.</span>
                <Heart size={19} />
              </div>
            </div>
            <div className="board-note note-bottom">
              <span className="note-icon">
                <MapPin size={18} />
              </span>
              <div>
                <strong>Same campus. So many stories.</strong>
                <span>Make a little room for yours.</span>
              </div>
            </div>
            <span className="board-spark">
              <Sparkles size={25} />
            </span>
          </div>
        </section>
        <section id="features" className="welcome-features">
          <div className="features-heading">
            <div>
              <p className="welcome-eyebrow">MORE THAN A CAMERA ROLL</p>
              <h2>
                Good memories deserve
                <br />
                <em>a place to belong.</em>
              </h2>
            </div>
            <p>
              A space for now. A surprise for later.
              <br />
              And the people who make it all worth saving.
            </p>
          </div>
          <div className="feature-showcase">
            <div
              className="feature-options"
              aria-label="Explore CampusCanva features"
            >
              {features.map((item, index) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={active === index}
                    aria-controls="feature-preview"
                    onClick={() => setActive(index)}
                    className={`feature-option ${active === index ? "is-active" : ""}`}
                  >
                    <span className="feature-icon">
                      <Icon size={20} />
                    </span>
                    <span>
                      <strong>
                        {index === 0
                          ? "Spaces that tell your story"
                          : index === 1
                            ? "A gift to your future self"
                            : "Shared with the right people"}
                      </strong>
                      <small>
                        {index === 0
                          ? "Keep every chapter together"
                          : index === 1
                            ? "Seal it now. Relive it later."
                            : "Public for campus. Private for your circle."}
                      </small>
                    </span>
                    <ArrowUpRight size={18} />
                  </button>
                );
              })}
            </div>
            <div
              id="feature-preview" role="region" aria-label="Feature preview" aria-live="polite"
              className={`feature-preview preview-${feature.id}`}
            >
              <div
                className="preview-illustration"
                aria-label={`${feature.id} feature illustration`}
              >
                {active === 0 ? (
                  <div className="space-preview">
                    <div className="mini-memory">
                      <CampusIllustration />
                      <span>
                        <MapPin size={12} /> Around campus
                      </span>
                    </div>
                    <div className="mini-memory mini-story">
                      <ImageIcon size={25} />
                      <strong>
                        The days
                        <br />
                        in between.
                      </strong>
                      <span>A space for your everyday favourites</span>
                      <div className="mini-avatars">
                        <span>A</span>
                        <span>M</span>
                        <span>R</span>
                        <small>Your people, together</small>
                      </div>
                    </div>
                    <span className="preview-caption">
                      An example of your next memory space
                    </span>
                  </div>
                ) : active === 1 ? (
                  <div className="capsule-preview">
                    <div className="capsule-seal">
                      <LockKeyhole size={31} />
                    </div>
                    <span className="capsule-label">TO OUR FUTURE SELVES</span>
                    <strong>
                      Open when
                      <br />
                      the time is right.
                    </strong>
                    <span className="capsule-date">
                      <Clock size={14} /> Your date. Your little reunion.
                    </span>
                    <span className="preview-caption">
                      Choose an unlock date when you create a capsule
                    </span>
                  </div>
                ) : (
                  <div className="sharing-preview">
                    <div className="sharing-head">
                      <span className="feature-icon">
                        <Users size={22} />
                      </span>
                      <div>
                        <strong>Your inner circle</strong>
                        <small>You set the boundaries.</small>
                      </div>
                      <span className="private-pill">
                        <LockKeyhole size={11} /> Private
                      </span>
                    </div>
                    {[
                      ["You", "Admin"],
                      ["Your friend", "Contributor"],
                      ["Your classmate", "Viewer"],
                    ].map(([name, role], i) => (
                      <div className="sharing-person" key={role}>
                        <span className={`person-avatar person-${i}`}>
                          {i === 0 ? "Y" : i === 1 ? "F" : "C"}
                        </span>
                        <strong>{name}</strong>
                        <span>{role}</span>
                      </div>
                    ))}
                    <p>
                      <Check size={13} /> Only members can see a private space.
                    </p>
                    <span className="preview-caption">
                      An example of the roles you can assign
                    </span>
                  </div>
                )}
              </div>
              <div className="preview-copy">
                <p className="welcome-eyebrow">{feature.eyebrow}</p>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
                <Link
                  to={isAuthenticated ? feature.path : "/register"}
                  className="welcome-text-link"
                >
                  {feature.action}
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </section>
        <section className="welcome-closing">
          <Leaf size={26} />
          <h2>
            Someday, these will be
            <br />
            <em>the good old days.</em>
          </h2>
          <p>Start saving a little of today.</p>
          <Link
            to={isAuthenticated ? "/dashboard" : "/register"}
            className="welcome-button"
          >
            {isAuthenticated
              ? "Back to my memories"
              : "Make your first memory space"}
            <ArrowRight size={16} />
          </Link>
        </section>
      </main>
      <footer className="welcome-footer">
        <Link to="/" className="welcome-brand">
          <span className="brand-mark">
            <Layers size={18} />
          </span>
          CampusCanva
        </Link>
        <span>Made for campus life · NSUT Delhi</span>
        <Link to="/login">
          Your memories are waiting <ArrowUpRight size={13} />
        </Link>
        <div className="welcome-connection">
          <DatabaseStatus />
        </div>
      </footer>
    </div>
  );
};
