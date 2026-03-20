import SwiftUI
import WidgetKit

#if canImport(ActivityKit)

  struct ConditionalForegroundViewModifier: ViewModifier {
    let color: String?

    func body(content: Content) -> some View {
      if let color = color {
        content.foregroundStyle(Color(hex: color))
      } else {
        content
      }
    }
  }

  struct DebugLog: View {
    #if DEBUG
      private let message: String
      init(_ message: String) {
        self.message = message
        print(message)
      }

      var body: some View {
        Text(message)
          .font(.caption2)
          .foregroundStyle(.red)
      }
    #else
      init(_: String) {}
      var body: some View { EmptyView() }
    #endif
  }

  struct LiveActivityView: View {
    let contentState: LiveActivityAttributes.ContentState
    let attributes: LiveActivityAttributes
    @State private var imageContainerSize: CGSize?

    var progressViewTint: Color? {
      attributes.progressViewTint.map { Color(hex: $0) }
    }

    var body: some View {
      VStack(spacing: 0) {
        // Main content with JEFIT-style gradient background
        VStack(spacing: 12) {
          // Header with app icon and info
          HStack(alignment: .center, spacing: 12) {
            // App icon
            if let imageName = contentState.imageName {
              Image.dynamic(assetNameOrPath: imageName)
                .resizable()
                .frame(width: 32, height: 32)
            }
            
            VStack(alignment: .leading, spacing: 2) {
              Text("JSON.fit")
                .font(.caption)
                .fontWeight(.medium)
                .foregroundStyle(.white.opacity(0.8))
              
              Text(contentState.title)
                .font(.title3)
                .fontWeight(.semibold)
                .foregroundStyle(.white)
            }
            
            Spacer()
            
            // Large JEFIT-style countdown timer
            if let date = contentState.timerEndDateInMilliseconds {
              Text(timerInterval: Date.toTimerInterval(miliseconds: date))
                .font(.system(size: 32, weight: .bold, design: .rounded))
                .foregroundStyle(progressViewTint ?? .blue)
                .shadow(color: .black.opacity(0.3), radius: 2, x: 0, y: 1)
            }
          }
          
          // Exercise details
          if let subtitle = contentState.subtitle {
            VStack(alignment: .leading, spacing: 6) {
              HStack {
                Text(subtitle)
                  .font(.footnote)
                  .fontWeight(.medium)
                  .foregroundStyle(.white.opacity(0.9))
                Spacer()
              }
            }
          }
        }
        .padding(16)
        .background(
          // JEFIT-style gradient
          LinearGradient(
            gradient: Gradient(stops: [
              .init(color: Color.black.opacity(0.9), location: 0),
              .init(color: Color.gray.opacity(0.8), location: 0.5), 
              .init(color: Color.black.opacity(0.9), location: 1)
            ]),
            startPoint: .topLeading,
            endPoint: .bottomTrailing
          )
        )
        
        // Bottom action bar
        HStack {
          Spacer()
          Button(action: {}) {
            HStack(spacing: 6) {
              Image(systemName: "forward.fill")
                .font(.caption)
              Text("Skip Rest")
                .font(.caption)
                .fontWeight(.medium)
            }
            .foregroundStyle(.white)
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
            .background((progressViewTint ?? .blue).opacity(0.8))
            .clipShape(RoundedRectangle(cornerRadius: 16))
          }
          Spacer()
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(Color.black.opacity(0.7))
      }
      .clipShape(RoundedRectangle(cornerRadius: 20))
      .shadow(color: .black.opacity(0.4), radius: 8, x: 0, y: 4)
    }
  }

#endif