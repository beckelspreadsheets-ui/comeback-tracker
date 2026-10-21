import UIKit
import Capacitor

/// Penguin Kart's root view controller: Capacitor's stock bridge plus one game tweak.
///
/// The in-race steering zone reaches the bottom and side edges of the screen, so
/// iOS edge gestures (home / app switcher at the bottom, Notification Center and
/// Control Center at the top) would steal steering swipes. Deferring every edge
/// gives the game the first swipe; iOS dims the home indicator and a second swipe
/// still reaches the system, so the player is never trapped.
///
/// SceneDelegate creates this as the window's root (since Capacitor 8.5 the window
/// is built in code, not by Main.storyboard); Main.storyboard names it too.
///
/// prefersHomeIndicatorAutoHidden is deliberately NOT overridden:
/// - Capacitor 8.5 declares it `public`, not `open`, on CAPBridgeViewController
///   (it belongs to the built-in SystemBars plugin), so overriding it here does
///   not compile.
/// - Auto-hide suits video, not games: the hidden indicator returns on every touch,
///   and with auto-hide on, iOS is reported to stop honouring the edge deferral
///   (SDL never combines the two for this reason).
/// To try auto-hide on a device anyway, set "plugins": { "SystemBars": { "hidden": true } }
/// in capacitor.config.json; no native change is needed.
class MainViewController: CAPBridgeViewController {

    override var preferredScreenEdgesDeferringSystemGestures: UIRectEdge {
        return .all
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        // Have UIKit re-read the edge preference now that the view is loaded.
        setNeedsUpdateOfScreenEdgesDeferringSystemGestures()
    }
}
