import { Route, Routes, useLocation } from "react-router-dom"
import { AnimatePresence } from "framer-motion"
import { AppLayout } from "@/layouts/AppLayout"
import { PageTransition } from "@/components/layout/PageTransition"
import { MatchesPage } from "@/pages/MatchesPage"
import { MatchDetailsPage } from "@/pages/MatchDetailsPage"
import { CompetitionsPage } from "@/pages/CompetitionsPage"
import { AssistantPage } from "@/pages/AssistantPage"

export default function App() {
  const location = useLocation()

  return (
    <AppLayout>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route
            path="/"
            element={
              <PageTransition>
                <MatchesPage />
              </PageTransition>
            }
          />
          <Route
            path="/match/:id"
            element={
              <PageTransition>
                <MatchDetailsPage />
              </PageTransition>
            }
          />
          <Route
            path="/competitions"
            element={
              <PageTransition>
                <CompetitionsPage />
              </PageTransition>
            }
          />
          <Route
            path="/assistant"
            element={
              <PageTransition>
                <AssistantPage />
              </PageTransition>
            }
          />
        </Routes>
      </AnimatePresence>
    </AppLayout>
  )
}
