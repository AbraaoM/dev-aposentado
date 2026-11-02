'use client'

export default function Home() {
  return (
    <div className="outer-frame">
      <div className="gba-screen">
        <div className="z-button">Z Button : Options</div>

        <div className="overworld">
          {/* Trees top */}
          <div className="tree t1" />
          <div className="tree t2" />
          <div className="tree t3" />
          <div className="tree t4" />
          <div className="tree t5" />

          {/* Left trees */}
          <div className="tree-left l1" />
          <div className="tree-left l2" />
          <div className="tree-left l3" />
          <div className="tree-left l4" />
          <div className="tree-left l5" />
          <div className="tree-left l6" />

          {/* Right trees */}
          <div className="tree-right r1" />
          <div className="tree-right r2" />
          <div className="tree-right r3" />
          <div className="tree-right r4" />
          <div className="tree-right r5" />
          <div className="tree-right r6" />

          {/* Flowers / bushes */}
          <div className="bush b1" />
          <div className="bush b2" />
          <div className="bush b3" />
          <div className="bush b4" />
          <div className="bush b5" />
          <div className="bush b6" />

          {/* Path */}
          <div className="path" />

          {/* Bottom plants */}
          <div className="plants-bottom" />

          {/* Characters */}
          <div className="char npc" />
          <div className="char player" />

          {/* Sign */}
          <div className="sign">
            <div className="sign-text">ROUTE</div>
          </div>
        </div>

        <div className="gamespot">GAMESOT</div>
      </div>
    </div>
  )
}
