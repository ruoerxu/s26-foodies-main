import foodiesLogo from "../assets/foodies logo.png";
import cuisineImage from "../assets/cuisines.jpg";
import dietImage from "../assets/diet.jpg";
import friendsImage from "../assets/friends.jpg";
import pizzaImage from "../assets/pizza.jpg";
import { useNavigate } from "react-router-dom";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div>
      <div className="landing-nav">
        <div className="landing-nav-left">
          <img src={foodiesLogo} alt="Foodies logo" width={60} />
        </div>
        <div className="landing-nav-right">
          <button className="landing-login" onClick={() => navigate("/login")}>
            Log in
          </button>
          <button
            className="landing-signup"
            onClick={() => navigate("/signup")}
          >
            Sign up
          </button>
        </div>
      </div>
      <div className="landing-page">
        <div className="landing-logo">
          <img src={foodiesLogo} alt="Foodies logo" width={180} />
          <span className="landing-logo-title">FOODIES</span>
        </div>
        <p className="landing-subtitle">
          Friends should never fight over restaurants, use FOODIES instead!
        </p>
        <div className="landing-card">
          <img
            className="landing-card-img"
            src={friendsImage}
            alt="Friends Image"
          />
          <div>
            <h3>Eat together, better, by creating parties</h3>
            <p>
              Create a party, invite your friends, and our algorithm will search
              for the best restaurants for you and your friends.
            </p>
          </div>
        </div>
        <div className="landing-card">
          <img
            className="landing-card-img"
            src={pizzaImage}
            alt="Pizza Image"
          />
          <div>
            <h3>Personalize your results</h3>
            <p>
              Add your liked and disliked cuisines, so that we know what to
              recommend!
            </p>
          </div>
        </div>
        <div className="landing-card">
          <img className="landing-card-img" src={dietImage} alt="Diet Image" />
          <div>
            <h3>Include everyone</h3>
            <p>
              No need to worry about everyone’s dietary restrictions. Put your
              dietary restriction in your profile and we’ll only recommend
              restaurants that work for everyone.
            </p>
          </div>
        </div>
        <div className="landing-card">
          <img
            className="landing-card-img"
            src={cuisineImage}
            alt="Cuisine Image"
          />
          <div>
            <h3>Craving something new?</h3>
            <p>
              With our session feature, you can choose what cuisine you want
              today, how much you want to spend, and how far you’re willing to
              drive.
            </p>
          </div>
        </div>
        <p className="landing-subtitle">I hope you're hungry!</p>
        <button
          className="landing-signup-bigger"
          onClick={() => navigate("/signup")}
        >
          Sign up
        </button>
      </div>
    </div>
  );
}
