import SwiftUI
import WidgetKit

extension Color {
  init?(hex: String) {
    let r, g, b, a: Double
    let hexColor = hex.hasPrefix("#") ? String(hex.dropFirst()) : hex
    let scanner = Scanner(string: hexColor)
    var hexNumber: UInt64 = 0
    
    if scanner.scanHexInt64(&hexNumber) {
      if hexColor.count == 8 {
        r = Double((hexNumber & 0xff000000) >> 24) / 255
        g = Double((hexNumber & 0x00ff0000) >> 16) / 255
        b = Double((hexNumber & 0x0000ff00) >> 8) / 255
        a = Double(hexNumber & 0x000000ff) / 255
      } else if hexColor.count == 6 {
        r = Double((hexNumber & 0xff0000) >> 16) / 255
        g = Double((hexNumber & 0x00ff00) >> 8) / 255
        b = Double(hexNumber & 0x0000ff) / 255
        a = 1.0
      } else {
        return nil
      }
      self.init(.sRGB, red: r, green: g, blue: b, opacity: a)
    } else {
      return nil
    }
  }
}

struct WorkoutLiveActivityView: View {
  let contentState: WorkoutLiveActivityAttributes.ContentState
  let attributes: WorkoutLiveActivityAttributes
  
  var body: some View {
    VStack(spacing: 0) {
      // Main content area with gradient background
      VStack(spacing: 12) {
        // Header with app icon and exercise info
        HStack(alignment: .center, spacing: 12) {
          // App icon
          if let iconName = contentState.iconName {
            Image(iconName)
              .resizable()
              .frame(width: 32, height: 32)
          }
          
          VStack(alignment: .leading, spacing: 2) {
            Text("JSON.fit")
              .font(.caption)
              .fontWeight(.medium)
              .foregroundStyle(.white.opacity(0.8))
            
            Text("REST")
              .font(.title3)
              .fontWeight(.semibold)
              .foregroundStyle(.white)
          }
          
          Spacer()
          
          // Large countdown timer
          Text(formatTime(contentState.remainingSeconds))
            .font(.system(size: 32, weight: .bold, design: .rounded))
            .foregroundStyle(Color(hex: contentState.themeColor) ?? .blue)
            .shadow(color: .black.opacity(0.3), radius: 2, x: 0, y: 1)
        }
        
        // Exercise details
        VStack(alignment: .leading, spacing: 8) {
          // Current exercise
          HStack {
            Text("Current:")
              .font(.caption)
              .fontWeight(.medium)
              .foregroundStyle(.white.opacity(0.7))
            Text(contentState.exerciseName)
              .font(.footnote)
              .fontWeight(.medium)
              .foregroundStyle(.white)
            Spacer()
          }
          
          // Set info and weight/reps
          if let setInfo = contentState.setInfo, !setInfo.isEmpty {
            HStack {
              Text(setInfo)
                .font(.caption)
                .fontWeight(.medium)
                .foregroundStyle(.white.opacity(0.9))
              
              if let weightReps = contentState.weightReps, !weightReps.isEmpty {
                Text("•")
                  .foregroundStyle(.white.opacity(0.5))
                Text(weightReps)
                  .font(.caption)
                  .fontWeight(.medium)
                  .foregroundStyle(.white.opacity(0.9))
              }
              Spacer()
            }
          }
          
          // Next exercise
          if let nextExercise = contentState.nextExercise, !nextExercise.isEmpty {
            HStack {
              Text("Next:")
                .font(.caption)
                .fontWeight(.medium)
                .foregroundStyle(.white.opacity(0.7))
              Text(nextExercise)
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
          // Skip rest action - this will be handled by the native module
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
            Color(hex: contentState.themeColor)?.opacity(0.8) ?? .blue.opacity(0.8)
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
  
  private func formatTime(_ seconds: Int) -> String {
    let minutes = seconds / 60
    let remainingSeconds = seconds % 60
    return String(format: "%d:%02d", minutes, remainingSeconds)
  }
}