---
title: "SwiftUI API Design: Sheet II"
subtitle: "In this part, we create a new initializer for the sheet that takes an `item` instead of a `isPresented` binding. We also run into some trouble along the way, and do a deep dive on how SwiftUI works."
colors: { b1: "bg-sky-200", b2: "bg-cyan-200", b3: "bg-blue-200" }
publishDate: 04/16/24
pubDate: 04/16/24
draft: false
---

We’re back for another closer look at our implementation of a sheet modifier.
Last time, we ended with an implementation that had the following deficiencies:

1. `item` initializer is unimplemented.
2. No dismiss behavior.
3. Safe areas might be broken.
4. Yet to think about how to implement view modifiers that change the behavior of the sheet.

Today, we will tackle the first of those deficiencies.

# Why `item`?

SwiftUI’s APIs are built on the idea of progressive disclosure. The most common cases are very simple to build. Often, the first sheet initializer, the one that takes an `isPresented` Binding is all you need. However, there are times when something more involved is necessary. For example, let’s imagine we’re building a sheet that displays the properties of this struct:

```swift
struct Item {
	var id: UUID
	var text: String
}
```

Let’s look at what it would look like for us to build this using the `isPresented` initializer, and why we would even want a different initializer.

A simple example View could look like this:

```swift
struct ContentView: View {
	@State var isPresented: Bool = false
	@State var item: Item? = nil

	var body: some View {
        VStack {
            Button("Change Item + Present Sheet") {
                item = Item(
					id: UUID(),
					text: "This is some text"
				)
                isPresented = true
            }
        }
        .sheet(
			isPresented: $isPresented,
			onDismiss: { item = nil }
		) {
            VStack(alignment: .leading) {
                Text("isPresented: \(isPresented)")
                Text("Text: \(item?.text)")
            }
        }
}
```

There are few reasons why this is not ideal.

First, we have a domain modeling issue. There is a common adage in domain modeling: **Make illegal states unrepresentable**.[^1] The idea here is that we should take advantage of Swift’s expressive type system. It allows us to model our state in such a way that we omit whole classes of bugs.

Here, we aren’t doing that. We have two properties that are inherently tied together, yet separate. This creates four states:

|                    | item: nil | item: some |
| ------------------ | --------- | ---------- |
| isPresented: true  | invalid   | valid      |
| isPresented: false | valid     | invalid    |

Only two of these states are valid, i.e, when isPresented and item correspond. Thus, we have to update them together.

This isn’t great. Since `item` has type `Item?`, we have all the information we need right there, without adding these invalid states. This alone calls for a more general variation of our API.

However, there is a second problem. The code snippet simply doesn’t work!

# An unexpected turn

At first glance, the code above seems perfectly reasonable. The `item` and `isPresented` bindings are updated together, and `item` is nil’d out when the sheet is dismissed. Therefore, they stay in sync.

However, this happens on first launch:

<video width="320" height="240" controls>
  <source src="/images/blog/sheet-2/weird_1.mp4" type="video/mp4">
</video>

What’s happening here?

We update both the bindings with our button. We know that’s working, because the sheet comes up. Why is the `isPresented` value within the sheet showing false? Why does it work from then onwards?

Let’s try to see if the binding updates outside the sheet by adding some text to the View:

```swift
struct ContentView: View {
	@State var isPresented: Bool = false
	@State var item: Item? = nil

	var body: some View {
        VStack {
			Text("isPresented: \(isPresented)")
            Text("Text: \(item?.text)")

            Button("Change Item + Present Sheet") {
                item = Item(
					id: UUID(),
					text: "This is some text"
				)
                isPresented = true
            }
        }
        .sheet(
			isPresented: $isPresented,
			onDismiss: { item = nil }
		) {
            VStack(alignment: .leading) {
                Text("isPresented: \(isPresented)")
                Text("Text: \(item?.text)")
            }
        }
	}
}
```

<video width="320" height="240" controls>
  <source src="/images/blog/sheet-2/weird_2.mp4" type="video/mp4">
</video>

Wait what? The bindings are updating correctly, but that has seemingly also fixed our issue. The sheet now shows the correct data even when we first open the sheet after launch. Why did a seemingly orthogonal change to our View (adding the `Text`s) suddenly change our sheet’s output?

# An unintended rabbit hole

I investigated, and found some very interesting things. Here’s my best guess at what’s going on.

It all has to do with how SwiftUI handles its `@State` bindings. What does `@State` actually do?

Let’s look first at why we aren’t able to mutate non-`@State` values in SwiftUI View bodies. We use this structure as an example:

```swift
struct ExampleView: View {
	var isPresented: Bool

	var body: some View {
		Button("Change Item + Present Sheet") {
        	isPresented = true
		//	^~~~~~~~
		//  Cannot assign to property: 'self' is immutable
        }
	}
}
```

As we know, `View`s in SwiftUI are modeled as value types. Further, the `body` property on `View` is a computed property. Generally, in computed property getters (which is what `body` is) we aren’t able to mutate properties.

We can try to get around this by making `body` a `mutating get`, but that doesn’t work either:

```swift
struct ExampleView: View {
	//	^~~~~~~~
	//  Type 'ExampleView' does not conform to protocol 'View'
    var isPresented: Bool

    var body: some View {
        mutating get {
            Button("Change Item + Present Sheet") {
                isPresented = true
            }
        }
    }
}
```

`View` requires body to be a non-mutating get. This makes sense. Value types for shared state is probably not a great idea, since value types are always copied. Instead, we want some reference type that stores our shared state. That’s what `@State` does. It opts the view into SwiftUI’s management of your variable, tying it to the view’s lifecycle. It stores the value in a reference type somewhere, allowing mutation.

Finally, to understand what’s happening in our sheet example, we need to understand how `@State` variables interact with SwiftUI Views. `@State` wraps the type of your variable in a `State<T>` wrapper. This wrapper conforms to a protocol called `DynamicProperty`. The only requirement to conform is implementing an `update()` function, which according to [Apple’s documentation](<https://developer.apple.com/documentation/swiftui/dynamicproperty/update()-29hjo>) is called “before rendering a view’s body to ensure the view has the most recent value.”

Therefore, it goes something like this: the change of an `@State` variable triggers a re-render of `body` if the variable is accessed in the body. Before the re-render, `update()` is called, to ensure we get the most recent value. `body` is computed with this updated value.

Now, our example looks like this:

```swift
struct ContentView: View {
	@State var isPresented: Bool = false
	@State var item: Item? = nil

	var body: some View {
        VStack {
		//  Text("isPresented: \(isPresented)")
        //  Text("Text: \(item?.text)")

            Button("Change Item + Present Sheet") {
                item = Item(
					id: UUID(),
					text: "This is some text"
				)
                isPresented = true
            }
        }
        .sheet(
			isPresented: $isPresented,
			onDismiss: { item = nil }
		) {
            VStack(alignment: .leading) {
                Text("isPresented: \(isPresented)")
                Text("Text: \(item?.text)")
            }
        }
	}
}
```

When `isPresented` is changed in the button closure, the binding is updated, but the body isn’t recomputed because `isPresented` isn’t used in the view’s body.

It _is_ used in the sheet, but that content is not yet rendered, and thus isn’t in SwiftUI’s rendering hierarchy. The change in binding presents the `sheet`, which causes the sheet’s `content` closure to be executed. However, since this isn’t a full body recomputation, `update()` still isn’t called on the `State` variables, providing us with the stale values we see in our sheet.

I suspect that this also explains why this fixes later sheet presentations: SwiftUI sees that the `@State` values are indeed used in the sheet, and recomputes the whole body when the sheet is presented.

You can try this yourself! In the above code, set a breakpoint on the body first line of the body property. You will see that the breakpoint isn’t hit the first time the bindings are changed, but is hit the subsequent times.

This is fascinating, and seems very odd indeed. Of course, this sleuthing is my best guess. SwiftUI works in a lot of magical ways, so if you have more insight, or a correction to something I’ve written about here, [let me know](https://lakshchakraborty.com/about#contact)!

# Back to `item`

I think the motivation for this initializer is now well established. Just as a reminder, the initializer looks like this:

```swift
.sheet(
    item: Binding<Identifiable?>,
    onDismiss: (() -> Void)?,
    content: (Identifiable) -> View
) -> View
```

It takes a Binding to an optional `Identifiable` type and returns the non-optional version to the `content` closure.

We have a few options for how we implement this:

1. Update our existing view modifier to include an initializer for a binding to an optional `Identifiable`
2. Duplicate our code, and make a whole new view modifier.

I prefer the latter approach to keep our code simple, but I’d also like to avoid duplicating all the styles. Therefore, we begin by pulling out the shared styling modifiers into its own modifier:

```swift
struct CustomSheetInternalModifier: ViewModifier {
    @State private var offset: CGFloat = 0

    func body(content: Content) -> some View {
        content
            .background(.background.secondary, in: .rect(cornerRadius: 50))
            .padding(4)
            .gesture(
                DragGesture(coordinateSpace: .global)
                    .onChanged { value in
                        offset = clip (
                            value: value.translation.height,
                            lower: -30,
                            upper: .infinity
                        )
                    }
                    .onEnded { value in
                        if value.predictedEndTranslation.height > 100 {
                            dismissAction()
                        }
                        offset = 0
                    }
            )
            .drawingGroup()
            .zIndex(1)
            .offset(y: offset)
            .animation(.spring, value: offset)
            .transition(.move(edge: .bottom))
    }
}
```

Now, we can simplify our `isPresented` version to this:

```swift
struct CustomSheet<SheetContent: View>: ViewModifier {
    @Binding var isPresented: Bool
    @ViewBuilder var sheetContent: () -> SheetContent

    func body(content: Content) -> some View {
        ZStack(alignment: .bottom) {
            content
                .overlay {
                    Color.black.opacity(isPresented ? 0.3 : 0.0)
                }

            if isPresented {
                sheetContent()
                    .modifier(CustomSheetInternalModifier())
            }
        }
        .animation(.snappy(duration: 0.3), value: isPresented)
        .ignoresSafeArea(.all, edges: .bottom)
    }
}
```

We now have a better place to begin the new implementation. The good news is that there are very few changes necessary to make this work with an `item` binding instead.

```swift
struct CustomItemSheet<Item: Identifiable, SheetContent: View>: ViewModifier { // 1
	@Binding var item: Item? //2
    @ViewBuilder var sheetContent: (Item) -> SheetContent // 3

	func body(content: Content) -> some View {
        ZStack(alignment: .bottom) {
            content
                .overlay {
                    Color.black.opacity(isPresented ? 0.3 : 0.0)
                }

            if let item { // 4
                sheetContent(item) // 5
                    .modifier(CustomSheetInternalModifier())
            }
        }
        .animation(.snappy(duration: 0.3), value: item != nil) // 6
        .ignoresSafeArea(.all, edges: .bottom)
    }
}
```

Here are the changes:

1. We add a new generic type that conforms to `Identifiable` to the signature.
2. The `isPresented` becomes an optional `Item`
3. The content closure now takes a _non-optional_ `Item` as an argument. This means that `Item` is unwrapped for you, no `if-let` necessary!
4. Unwrap `item`, and only show content if it is non-nil.
5. Pass item to the sheet content closure.
6. The value that the animation will fire for is now `item != nil`, which will make sure to not animate when `item` changes to a new non-nil value. This avoids accidental animations firing.

Now all we have to do is make a new extension on View:

```swift
func customSheet<Item, SheetContent>(
        item: Binding<Item?>,
        onDismiss: (() -> Void)? = nil,
        @ViewBuilder sheetContent: @escaping (Item) -> SheetContent
    ) -> some View where Item: Identifiable, SheetContent: View {
        modifier(
            CustomItemSheet(
                item: item,
                onDismiss: onDismiss,
                sheetContent: sheetContent
            )
        )
    }

```

This is exactly what our previews extension looked like, except with an additional `Item` generic type.

Finally, we have a sheet that works just like the SwiftUI version!

```swift
struct ContentView: View {
    @State var item: Item? = nil

    var body: some View {
        VStack {
            Button("Change Item + Present Sheet") {
                item = Item(
                    id: UUID(),
                    text: "This is some text"
                )
            }
        }
        .customSheet(item: $item) { item in
            VStack(alignment: .leading) {
                Text("Text: \(item.text)")
            }
        }
    }
}
```

Next time, we’ll add dismiss behaviors, including an `onDismiss` closure, and some values in the environment that help with sheet dismissal! Stay tuned!

As always, the code for this project is on [Github](https://github.com/reftonull/ExploringSheet). It might be a little ahead even 👀

[^1]: There are many variations on this phrase, but this version was coined by [Yaron Minsky](https://twitter.com/yminsky/status/1034947939364425731) in the context of OCaml for a series of [guest lectures](https://blog.janestreet.com/effective-ml-video/) at Harvard and Northwestern.
