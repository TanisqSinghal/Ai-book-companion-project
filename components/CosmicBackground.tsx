// Decorative deep-space backdrop that fills the space around the page content (purely visual, CSS-animated)
const CosmicBackground = () => (
    <div className="cosmic-bg" aria-hidden="true">
        <div className="cosmic-stars cosmic-stars-far" />
        <div className="cosmic-stars cosmic-stars-near" />
        <div className="cosmic-orb cosmic-orb-cool" />
        <div className="cosmic-orb cosmic-orb-warm" />
        <span className="cosmic-shooting-star cosmic-shooting-star-1" />
        <span className="cosmic-shooting-star cosmic-shooting-star-2" />
    </div>
);

export default CosmicBackground;
