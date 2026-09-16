package ee.gemspot.api.seed;

import ee.gemspot.api.domain.Profile;
import ee.gemspot.api.domain.User;
import ee.gemspot.api.domain.UserRole;
import ee.gemspot.api.repository.CategoryRepository;
import ee.gemspot.api.repository.PlaceCategoryRepository;
import ee.gemspot.api.repository.PlaceRepository;
import ee.gemspot.api.repository.ProfileRepository;
import ee.gemspot.api.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Admin bootstrap is create-only: an already-registered address is never promoted. */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class DataSeederAdminTest {

    @Mock CategoryRepository categories;
    @Mock PlaceRepository places;
    @Mock PlaceCategoryRepository placeCategories;
    @Mock UserRepository users;
    @Mock ProfileRepository profiles;

    private DataSeeder seeder() {
        return new DataSeeder(categories, places, placeCategories, users, profiles,
                new BCryptPasswordEncoder());
    }

    @Test
    void existingAccountIsNotPromoted() {
        User squatter = new User();
        squatter.setEmail("admin@gemspot.ee");
        squatter.setRole(UserRole.CLIENT);
        when(users.findByEmail(any())).thenReturn(Optional.of(squatter));

        seeder().seedAdmin();

        assertThat(squatter.getRole()).isEqualTo(UserRole.CLIENT);
        verify(users, never()).save(any());
        verify(profiles, never()).save(any());
    }

    @Test
    void absentAccountIsCreatedAsAdmin() {
        when(users.findByEmail(any())).thenReturn(Optional.empty());
        when(users.save(any(User.class))).thenAnswer(i -> i.getArgument(0));

        seeder().seedAdmin();

        ArgumentCaptor<User> saved = ArgumentCaptor.forClass(User.class);
        verify(users).save(saved.capture());
        assertThat(saved.getValue().getRole()).isEqualTo(UserRole.ADMIN);
        assertThat(saved.getValue().getPasswordHash()).startsWith("$2");
        verify(profiles).save(any(Profile.class));
    }
}
