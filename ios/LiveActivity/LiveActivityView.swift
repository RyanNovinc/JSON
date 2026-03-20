import SwiftUI
import WidgetKit

#if canImport(ActivityKit)


struct LiveActivityView: View {
  let contentState: LiveActivityAttributes.ContentState
  let attributes: LiveActivityAttributes
  
  private func formatTime(_ date: Double) -> String {
    let now = Date().timeIntervalSince1970 * 1000
    let remaining = max(0, Int((date - now) / 1000))
    let minutes = remaining / 60
    let seconds = remaining % 60
    return String(format: "%d:%02d", minutes, seconds)
  }
  
  var body: some View {
    VStack(spacing: 0) {
      // Main content area with JEFIT-style gradient background
      VStack(spacing: 12) {
        // Header with app icon and exercise info
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
          if let endDate = contentState.timerEndDateInMilliseconds {
            Text(formatTime(endDate))
              .font(.system(size: 32, weight: .bold, design: .rounded))
              .foregroundStyle(Color(hex: attributes.progressViewTint ?? "#007AFF"))
              .shadow(color: .black.opacity(0.3), radius: 2, x: 0, y: 1)
          }
        }
        
        // Exercise details
        VStack(alignment: .leading, spacing: 8) {
          // Current exercise
          if let subtitle = contentState.subtitle, !subtitle.isEmpty {
            HStack {
              Text("Current:")
                .font(.caption)
                .fontWeight(.medium)
                .foregroundStyle(.white.opacity(0.7))
              Text(subtitle)
                .font(.footnote)
                .fontWeight(.medium)
                .foregroundStyle(.white)
              Spacer()
            }
          }
          
          // Next exercise (if we can extract from title/subtitle)
          HStack {
            Text("Next:")
              .font(.caption)
              .fontWeight(.medium)
              .foregroundStyle(.white.opacity(0.7))
            Text("Next Exercise")
              .font(.footnote)
              .fontWeight(.medium)
              .foregroundStyle(.white.opacity(0.9))
            Spacer()
          }
        }
      }
      .padding(16)
      .background(
        // JEFIT-style gradient background
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
        Button(action: {
          // Skip rest action - handled by deep link
        }) {
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
          .background(
            Color(hex: attributes.progressViewTint ?? "#007AFF").opacity(0.8)
          )
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